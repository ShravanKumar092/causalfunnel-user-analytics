/**
 * FunnelTrack Analytics SDK
 * Lightweight, privacy-conscious vanilla JavaScript user behavior tracking library.
 *
 * NOTE ON SESSION IDENTIFICATION:
 * This implementation uses a persistent browser identifier stored in localStorage
 * rather than a server-managed or time-decayed session. This provides reliable attribution
 * across page navigations without invasive device fingerprinting or collecting PII.
 *
 * NOTE ON COORDINATE SYSTEM:
 * Click events record viewport-relative coordinates (clientX, clientY) matched with the
 * corresponding viewport dimensions (window.innerWidth, window.innerHeight).
 * This ensures coordinates can be reliably normalized (click_x / viewport_width) for responsive heatmaps.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FunnelTrack = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Private state
  var _config = {
    apiUrl: 'http://localhost:5000/api',
    trackPageViews: true,
    trackClicks: true,
    debug: false,
    maxRetries: 3
  };

  var _initialized = false;
  var _sessionId = null;
  var _lastTrackedPageUrl = null;
  var _listeners = [];
  var _pendingQueue = [];
  var _memorySessionId = null;
  var _lastActivityAt = 0;
  var SESSION_TTL_MS = 30 * 60 * 1000;

  /**
   * Safe logger
   */
  function log(message, data) {
    if (_config.debug && typeof console !== 'undefined' && console.log) {
      console.log('[FunnelTrack] ' + message, data !== undefined ? data : '');
    }
  }

  function logError(message, err) {
    if (_config.debug && typeof console !== 'undefined' && console.error) {
      console.error('[FunnelTrack Error] ' + message, err !== undefined ? err : '');
    }
  }

  /**
   * Generate UUID v4 with cryptographically secure fallback
   */
  function generateUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch (e) {
        // Fall through to fallback
      }
    }

    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) {
        return (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16);
      });
    }

    // Mathematical pseudo-random fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Session ID management via localStorage with memory fallback
   */
  function getOrCreateSessionId() {
    var storageKey = 'funneltrack_session_id';

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        var existing = window.localStorage.getItem(storageKey);
        var expiresAt = Number(window.localStorage.getItem(storageKey + '_expires') || 0);
        if (existing && existing.length > 8 && expiresAt > Date.now()) {
          _sessionId = existing;
          touchSession();
          return _sessionId;
        }
        var newId = generateUUID();
        window.localStorage.setItem(storageKey, newId);
        window.localStorage.setItem(storageKey + '_expires', String(Date.now() + SESSION_TTL_MS));
        _sessionId = newId;
        _memorySessionId = newId;
        _lastActivityAt = Date.now();
        return newId;
      }
    } catch (e) {
      log('localStorage unavailable or blocked. Using memory fallback session.');
    }

    if (!_memorySessionId || Date.now() - _lastActivityAt >= SESSION_TTL_MS) {
      _memorySessionId = generateUUID();
      _sessionId = _memorySessionId;
      _lastTrackedPageUrl = null;
    }
    _lastActivityAt = Date.now();
    return _memorySessionId;
  }

  function touchSession() {
    var now = Date.now();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        var storageKey = 'funneltrack_session_id';
        var storedId = window.localStorage.getItem(storageKey);
        var expiresAt = Number(window.localStorage.getItem(storageKey + '_expires') || 0);
        if (!storedId || expiresAt <= now) {
          storedId = generateUUID();
          window.localStorage.setItem(storageKey, storedId);
          _lastTrackedPageUrl = null;
        }
        if (storedId) {
          _sessionId = storedId;
          _memorySessionId = storedId;
          window.localStorage.setItem(storageKey + '_expires', String(now + SESSION_TTL_MS));
        }
      }
    } catch (e) {
      // Storage can become unavailable after initialization; tracking remains in memory.
      if (!_sessionId || now - _lastActivityAt >= SESSION_TTL_MS) {
        _sessionId = generateUUID();
        _memorySessionId = _sessionId;
        _lastTrackedPageUrl = null;
      }
    }
    _lastActivityAt = now;
  }

  function getSafeReferrer() {
    if (!document.referrer) return null;
    try {
      var referrerUrl = new URL(document.referrer);
      if (referrerUrl.protocol !== 'http:' && referrerUrl.protocol !== 'https:') return null;
      return referrerUrl.origin + referrerUrl.pathname;
    } catch (e) {
      return null;
    }
  }

  /**
   * Check if an element should be excluded from click tracking (sensitive fields)
   */
  function isSensitiveElement(el) {
    if (!el) return false;

    var tagName = (el.tagName || '').toLowerCase();
    var inputType = (el.type || '').toLowerCase();

    // Exclude password inputs or payment fields
    if (inputType === 'password') return true;
    if (el.getAttribute && (el.getAttribute('data-private') === 'true' || el.getAttribute('data-sensitive') === 'true')) {
      return true;
    }

    // Check parent tree up to 3 levels
    var parent = el.parentElement;
    var depth = 0;
    while (parent && depth < 3) {
      if (parent.getAttribute && (parent.getAttribute('data-private') === 'true' || parent.getAttribute('data-sensitive') === 'true')) {
        return true;
      }
      parent = parent.parentElement;
      depth++;
    }

    return false;
  }

  /**
   * Notify external event listeners (e.g., demo page UI badge)
   */
  function notifyListeners(event) {
    for (var i = 0; i < _listeners.length; i++) {
      try {
        _listeners[i](event);
      } catch (e) {
        logError('Error in event listener callback', e);
      }
    }
  }

  /**
   * Send payload via fetch or sendBeacon
   */
  function sendPayload(payload, useBeacon, retryCount) {
    retryCount = retryCount || 0;
    var endpoint = _config.apiUrl.replace(/\/+$/, '') + '/events';

    // Notify UI listeners immediately
    notifyListeners(payload);

    // If page is unloading and sendBeacon is available
    if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        var queued = navigator.sendBeacon(endpoint, blob);
        if (queued) {
          log('Delivered event via sendBeacon', payload.event_type);
          return;
        }
      } catch (beaconErr) {
        log('sendBeacon failed, falling back to fetch', beaconErr);
      }
    }

    // Default: use Fetch API
    if (typeof fetch === 'function') {
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        keepalive: true
      })
        .then(function (res) {
          if (!res.ok) {
            throw new Error('HTTP ' + res.status);
          }
          return res.json();
        })
        .then(function (data) {
          log('Event delivered successfully:', { type: payload.event_type, id: data.data && data.data.id });
        })
        .catch(function (err) {
          logError('Failed to send event:', err.message);
          // Bounded retry logic (max configured retries, no infinite loop)
          if (retryCount < _config.maxRetries) {
            var delay = Math.pow(2, retryCount) * 1000;
            log('Scheduling retry ' + (retryCount + 1) + ' in ' + delay + 'ms');
            setTimeout(function () {
              sendPayload(payload, false, retryCount + 1);
            }, delay);
          }
        });
    } else {
      // Fallback XMLHttpRequest for older environments
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
      } catch (xhrErr) {
        logError('XHR transmission error', xhrErr);
      }
    }
  }

  /**
   * Track Page View Event
   */
  function trackPageView(forcedUrl) {
    if (typeof window === 'undefined') return;

    var currentUrl = forcedUrl || window.location.href;
    touchSession();

    // Prevent duplicate page view events for identical URL within short window
    if (_lastTrackedPageUrl === currentUrl) {
      log('Suppressed duplicate page_view for ' + currentUrl);
      return;
    }

    _lastTrackedPageUrl = currentUrl;

    var payload = {
      session_id: _sessionId,
      event_type: 'page_view',
      page_url: currentUrl,
      timestamp: new Date().toISOString(),
      page_title: (document.title || '').slice(0, 300),
      referrer: getSafeReferrer(),
      click_x: null,
      click_y: null,
      viewport_width: window.innerWidth || null,
      viewport_height: window.innerHeight || null
    };

    log('Tracking page_view event:', payload);
    sendPayload(payload, false);
  }

  /**
   * Track Click Event
   */
  function trackClick(e) {
    if (!e) return;
    touchSession();

    var target = e.target || e.srcElement;
    if (isSensitiveElement(target)) {
      log('Ignored click on sensitive form element');
      return;
    }

    // Viewport-relative coordinates (clientX, clientY)
    var clientX = Math.round(e.clientX);
    var clientY = Math.round(e.clientY);

    // Ensure valid coordinates
    if (clientX < 0 || clientY < 0) return;

    var payload = {
      session_id: _sessionId,
      event_type: 'click',
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      page_title: (document.title || '').slice(0, 300),
      referrer: getSafeReferrer(),
      element_type: target && target.tagName ? target.tagName.toLowerCase() : null,
      x: clientX,
      y: clientY,
      click_x: clientX,
      click_y: clientY,
      viewport_width: window.innerWidth || null,
      viewport_height: window.innerHeight || null
    };

    log('Tracking click event at (' + clientX + ', ' + clientY + '):', payload);
    sendPayload(payload, false);
  }

  /**
   * Setup automated listeners
   */
  function attachListeners() {
    if (typeof window === 'undefined') return;

    // 1. Page view on load
    if (_config.trackPageViews) {
      trackPageView();

      // Client-side routing listeners (History API + popstate)
      window.addEventListener('popstate', function () {
        trackPageView();
      });
      window.addEventListener('hashchange', function () {
        trackPageView();
      });

      // Monkey-patch pushState & replaceState for SPA route changes
      if (typeof history !== 'undefined') {
        var originalPushState = history.pushState;
        if (originalPushState) {
          history.pushState = function () {
            originalPushState.apply(this, arguments);
            trackPageView();
          };
        }

        var originalReplaceState = history.replaceState;
        if (originalReplaceState) {
          history.replaceState = function () {
            originalReplaceState.apply(this, arguments);
            trackPageView();
          };
        }
      }
    }

    // 2. Click tracking
    if (_config.trackClicks) {
      document.addEventListener('click', trackClick, true);
    }

    // 3. Page unload beacon delivery for any pending events
    window.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && _pendingQueue.length > 0) {
        while (_pendingQueue.length > 0) {
          var item = _pendingQueue.shift();
          sendPayload(item, true);
        }
      }
    });
  }

  /**
   * Public API
   */
  var FunnelTrack = {
    /**
     * Initialize SDK with options
     */
    init: function (options) {
      if (_initialized) {
        log('FunnelTrack is already initialized; ignoring duplicate init to avoid duplicate listeners.');
        return this;
      }

      options = options || {};
      _config.apiUrl = options.apiUrl || _config.apiUrl;
      _config.trackPageViews = options.trackPageViews !== undefined ? Boolean(options.trackPageViews) : true;
      _config.trackClicks = options.trackClicks !== undefined ? Boolean(options.trackClicks) : true;
      _config.debug = options.debug !== undefined ? Boolean(options.debug) : false;

      _sessionId = getOrCreateSessionId();
      _initialized = true;

      log('FunnelTrack initialized with session ID: ' + _sessionId, _config);

      attachListeners();
      return this;
    },

    /**
     * Get current persistent session ID
     */
    getSessionId: function () {
      return _sessionId || getOrCreateSessionId();
    },

    /**
     * Reset session ID (creates new session)
     */
    resetSession: function () {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('funneltrack_session_id');
        }
      } catch (e) {}
      try { window.localStorage.removeItem('funneltrack_session_id_expires'); } catch (e) {}
      _memorySessionId = null;
      _sessionId = getOrCreateSessionId();
      _lastActivityAt = Date.now();
      _lastTrackedPageUrl = null;
      log('Session reset. New session ID: ' + _sessionId);
      if (_config.trackPageViews) {
        trackPageView();
      }
      return _sessionId;
    },

    /**
     * Manually record a custom page view
     */
    trackPageView: function (customUrl) {
      trackPageView(customUrl);
    },

    /**
     * Subscribe to tracked events for on-page real-time inspection
     */
    onEventTracked: function (callback) {
      if (typeof callback === 'function') {
        _listeners.push(callback);
      }
    }
  };

  // Optional zero-boilerplate integration: set CAUSALFUNNEL_CONFIG before loading this file.
  if (typeof window !== 'undefined' && window.CAUSALFUNNEL_CONFIG) {
    FunnelTrack.init(window.CAUSALFUNNEL_CONFIG);
  }

  return FunnelTrack;
});
