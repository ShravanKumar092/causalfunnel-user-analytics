const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadTracker() {
  const listeners = {};
  const calls = [];
  const values = new Map();
  const document = {
    title: 'Demo page',
    referrer: 'https://example.test/previous',
    visibilityState: 'visible',
    addEventListener: (name, handler) => { listeners[`document:${name}`] = handler; }
  };
  const window = {
    location: { href: 'https://example.test/products' },
    innerWidth: 390,
    innerHeight: 844,
    localStorage: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key)
    },
    addEventListener: (name, handler) => { listeners[`window:${name}`] = handler; }
  };
  const sandbox = {
    self: window,
    window,
    document,
    navigator: {},
    fetch: (url, options) => {
      calls.push({ url, payload: JSON.parse(options.body) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: { id: 'event-id' } }) });
    },
    console,
    setTimeout,
    Blob,
    Date,
    URL,
    Math
  };
  const source = fs.readFileSync(path.join(__dirname, 'funneltrack.js'), 'utf8');
  vm.runInNewContext(source, sandbox);
  return { tracker: window.FunnelTrack, calls, listeners, document, values };
}

test('records a page view and viewport-relative, privacy-safe click', async () => {
  const { tracker, calls, listeners, values } = loadTracker();
  tracker.init({ apiUrl: 'https://api.example.test/api' });
  const sessionId = tracker.getSessionId();

  assert.ok(sessionId);
  assert.equal(values.get('funneltrack_session_id'), sessionId);
  assert.equal(calls[0].url, 'https://api.example.test/api/events');
  assert.equal(calls[0].payload.event_type, 'page_view');
  assert.equal(calls[0].payload.page_title, 'Demo page');
  assert.equal(calls[0].payload.referrer, 'https://example.test/previous');

  const clickHandler = listeners['document:click'];
  clickHandler({ target: { tagName: 'BUTTON' }, clientX: 24, clientY: 56 });
  const click = calls[1].payload;
  assert.equal(click.event_type, 'click');
  assert.equal(click.session_id, sessionId);
  assert.equal(click.x, 24);
  assert.equal(click.y, 56);
  assert.equal(click.viewport_width, 390);
  assert.equal(click.viewport_height, 844);
  assert.equal(click.element_type, 'button');
  assert.equal(Object.hasOwn(click, 'value'), false);

  values.set('funneltrack_session_id_expires', String(Date.now() - 1));
  clickHandler({ target: { tagName: 'A' }, clientX: 80, clientY: 90 });
  assert.notEqual(calls[2].payload.session_id, sessionId);
  assert.ok(Number(values.get('funneltrack_session_id_expires')) > Date.now());

  clickHandler({ target: { tagName: 'INPUT', type: 'password' }, clientX: 20, clientY: 20 });
  await Promise.resolve();
  assert.equal(calls.length, 3);
});

test('repeated initialization does not install duplicate trackers', () => {
  const { tracker, calls } = loadTracker();
  tracker.init();
  tracker.init();
  assert.equal(calls.filter((call) => call.payload.event_type === 'page_view').length, 1);
});
