# FunnelTrack SDK & E-Commerce Demo

Lightweight, privacy-conscious vanilla JavaScript behavioral tracking library and accompanying demonstration e-commerce storefront.

---

## 1. Quick Integration Guide

To track interactions on any website, include `funneltrack.js` before the closing `</body>` tag and initialize:

```html
<script src="path/to/funneltrack.js"></script>
<script>
  FunnelTrack.init({
    apiUrl: 'http://localhost:5000/api', // FunnelTrack backend endpoint
    trackPageViews: true,                // Automatically track initial load & SPA navigations
    trackClicks: true,                   // Automatically capture click events
    debug: true                          // Output events to developer console
  });
</script>
```

The backend also serves the SDK at `http://localhost:5000/tracker.js`. For that hosted form, the SDK auto-initializes from a config object declared before the deferred script:

```html
<script>
  window.CAUSALFUNNEL_CONFIG = {
    apiUrl: 'https://your-api.example.com/api',
    debug: false
  };
</script>
<script src="https://your-api.example.com/tracker.js" defer></script>
```

Session IDs use first-party `localStorage` with a sliding 30-minute inactivity expiry. If browser storage is unavailable, the SDK uses an in-memory ID for that page load; events still send, but the ID cannot survive a reload.

---

## 2. Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `apiUrl` | String | `'http://localhost:5000/api'` | Target REST API ingestion base URL |
| `trackPageViews` | Boolean | `true` | Records initial page load and client-side route changes |
| `trackClicks` | Boolean | `true` | Records element click coordinates and viewport metrics |
| `debug` | Boolean | `false` | Enables verbose browser console telemetry logs |
| `maxRetries` | Number | `3` | Maximum bounded retries for failed network transmissions |

---

## 3. Architecture & Privacy Decisions

### Session Identification
- **Method**: Generates an RFC 4122 v4 UUID (via `crypto.randomUUID()` with fallback) and stores it in `localStorage` (`funneltrack_session_id`).
- **Rationale**: Acts as a persistent browser identifier rather than a time-decaying session cookie. This ensures accurate user journey reconstruction across multiple tabs and page refreshes.
- **Privacy First**: FunnelTrack **does not use canvas fingerprinting, audio fingerprinting, or invasive browser probing**.
- **No PII**: The tracker automatically skips clicks on password fields (`<input type="password">`) and elements tagged with `data-private="true"`. Form input text is never collected.

### Coordinate System & Viewport Normalization
- **Coordinate Basis**: Recorded coordinates are **viewport-relative** (`clientX`, `clientY`).
- **Normalization Equation**:
  $$\text{Normalized } X = \frac{\text{click\_x}}{\text{viewport\_width}}$$
  $$\text{Normalized } Y = \frac{\text{click\_y}}{\text{viewport\_height}}$$
- By pairing each click with the user's active `viewport_width` and `viewport_height`, the analytics heatmap can accurately project clicks across varying screen resolutions (desktop, tablet, mobile) onto a unified canvas.

---

## 4. Public API Methods

- `FunnelTrack.init(options)`: Configures and activates event capture.
- `FunnelTrack.getSessionId()`: Returns the active session ID string.
- `FunnelTrack.resetSession()`: Clears stored session ID, generates a new one, and fires a page view.
- `FunnelTrack.trackPageView(customUrl)`: Manually registers a page view.
- `FunnelTrack.onEventTracked(callback)`: Registers a listener called every time an event is recorded (used by the live inspector dock in the demo).

---

## 5. Running the Demo Store Locally

The demo storefront (`demo.html`) simulates a modern lifestyle & technology store (**AuraMarket**) with interactive product modals, category filtering, cart operations, and an on-screen **Live Tracker Dock**.

Product cards use descriptive product photography served by the Unsplash image CDN. An internet connection is needed to load those photos; the store interactions themselves continue to work if the analytics SDK is unavailable.

### Option A: Using Python (Built-in)
```powershell
cd funneltrack/tracker
python -m http.server 5500
```
Then navigate to: `http://localhost:5500/demo.html`

### Option B: Using npx serve
```powershell
cd funneltrack/tracker
npx serve -l 5500 .
```

### Option C: Direct File Opening
You can double-click `demo.html` or open `file:///.../funneltrack/tracker/demo.html` in Chrome/Edge/Firefox. The tracker SDK is configured to handle local file origins seamlessly.

---

## 6. Verifying Tracked Data

1. Open `demo.html` in your browser with Developer Tools (F12) open.
2. Note the **FunnelTrack Dock** at the bottom of the screen showing your live session ID and real-time click counter.
3. Click on products, add items to cart, filter categories, or open the Quick View modal.
4. Check the Network tab for `POST http://localhost:5000/api/events` returning HTTP `201 Created`.
5. Open the FunnelTrack React Dashboard (`http://localhost:5173`) to view your session timeline and heatmap!
