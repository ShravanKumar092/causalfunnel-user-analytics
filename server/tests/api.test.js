const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../dist/app');
const Event = require('../dist/models/Event');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await Event.deleteMany({});
});

describe('FunnelTrack Backend REST API Test Suite', () => {
  test('accepts x/y click coordinates and retains safe page metadata', async () => {
    const response = await request(app).post('/api/events').send({
      session_id: 'session-alias-coords',
      event_type: 'click',
      page_url: 'https://example.com/products',
      timestamp: new Date().toISOString(),
      x: 12,
      y: 34,
      viewport_width: 390,
      viewport_height: 844,
      page_title: 'Products',
      referrer: 'https://example.com/',
      element_type: 'button',
      arbitrary_client_field: 'must be ignored'
    }).expect(201);

    const stored = await Event.findById(response.body.data.id).lean();
    expect(stored.x).toBe(12);
    expect(stored.y).toBe(34);
    expect(stored.click_x).toBe(12);
    expect(stored.page_title).toBe('Products');
    expect(stored).not.toHaveProperty('arbitrary_client_field');
  });

  // Test 1: Successful event ingestion (click)
  test('1. Successful event ingestion for click event', async () => {
    const clickPayload = {
      session_id: 'sess-test-101',
      event_type: 'click',
      page_url: 'http://localhost:5500/demo.html',
      timestamp: new Date().toISOString(),
      click_x: 250,
      click_y: 400,
      viewport_width: 1440,
      viewport_height: 900
    };

    const res = await request(app)
      .post('/api/events')
      .send(clickPayload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Event stored successfully');
    expect(res.body.data).toHaveProperty('id');

    // Verify stored event in database
    const savedEvent = await Event.findById(res.body.data.id);
    expect(savedEvent).not.toBeNull();
    expect(savedEvent.session_id).toBe('sess-test-101');
    expect(savedEvent.event_type).toBe('click');
    expect(savedEvent.click_x).toBe(250);
    expect(savedEvent.click_y).toBe(400);
  });

  // Test 2: Rejection of invalid event types
  test('2. Rejection of invalid event types', async () => {
    const invalidPayload = {
      session_id: 'sess-test-102',
      event_type: 'scroll', // Invalid event type
      page_url: 'http://localhost:5500/demo.html',
      timestamp: new Date().toISOString()
    };

    const res = await request(app)
      .post('/api/events')
      .send(invalidPayload)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('event_type is required and must be either "page_view" or "click"')])
    );
  });

  // Test 3: Rejection of missing session IDs
  test('3. Rejection of missing session IDs', async () => {
    const missingSessionPayload = {
      event_type: 'page_view',
      page_url: 'http://localhost:5500/demo.html',
      timestamp: new Date().toISOString(),
      viewport_width: 1440,
      viewport_height: 900
    };

    const res = await request(app)
      .post('/api/events')
      .send(missingSessionPayload)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('session_id is required')])
    );
  });

  // Test 4: Rejection of invalid click coordinates
  test('4. Rejection of invalid click coordinates', async () => {
    // Missing or invalid numeric coordinates
    const invalidCoordsPayload = {
      session_id: 'sess-test-104',
      event_type: 'click',
      page_url: 'http://localhost:5500/demo.html',
      timestamp: new Date().toISOString(),
      click_x: 'invalid-string',
      click_y: -15, // Negative coordinate
      viewport_width: 1440,
      viewport_height: 900
    };

    const res = await request(app)
      .post('/api/events')
      .send(invalidCoordsPayload)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('click_x must be a non-negative number'),
        expect.stringContaining('click_y must be a non-negative number')
      ])
    );
  });

  // Test 5: Acceptance of valid page-view events
  test('5. Acceptance of valid page-view events with null coordinates', async () => {
    const pageViewPayload = {
      session_id: 'sess-test-105',
      event_type: 'page_view',
      page_url: 'http://localhost:5500/demo.html/products',
      timestamp: new Date().toISOString(),
      click_x: null,
      click_y: null,
      viewport_width: 1920,
      viewport_height: 1080
    };

    const res = await request(app)
      .post('/api/events')
      .send(pageViewPayload)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');

    const saved = await Event.findById(res.body.data.id);
    expect(saved.event_type).toBe('page_view');
    expect(saved.click_x).toBeNull();
    expect(saved.click_y).toBeNull();
  });

  // Test 6: Session aggregation
  test('6. Session aggregation calculation via GET /api/sessions', async () => {
    // Seed events for two distinct sessions
    const now = Date.now();

    await Event.create([
      {
        session_id: 'sess-agg-A',
        event_type: 'page_view',
        page_url: 'http://localhost:5500/home',
        timestamp: new Date(now - 5000),
        viewport_width: 1440,
        viewport_height: 900
      },
      {
        session_id: 'sess-agg-A',
        event_type: 'click',
        page_url: 'http://localhost:5500/home',
        timestamp: new Date(now - 4000),
        click_x: 100,
        click_y: 150,
        viewport_width: 1440,
        viewport_height: 900
      },
      {
        session_id: 'sess-agg-A',
        event_type: 'click',
        page_url: 'http://localhost:5500/products',
        timestamp: new Date(now - 3000),
        click_x: 300,
        click_y: 200,
        viewport_width: 1440,
        viewport_height: 900
      },
      {
        session_id: 'sess-agg-B',
        event_type: 'page_view',
        page_url: 'http://localhost:5500/deals',
        timestamp: new Date(now - 1000),
        viewport_width: 1200,
        viewport_height: 800
      }
    ]);

    const res = await request(app)
      .get('/api/sessions?page=1&limit=10')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.sessions).toHaveLength(2);
    expect(res.body.data.pagination.totalSessions).toBe(2);

    const sessionA = res.body.data.sessions.find((s) => s.session_id === 'sess-agg-A');
    expect(sessionA).toBeDefined();
    expect(sessionA.total_events).toBe(3);
    expect(sessionA.page_views).toBe(1);
    expect(sessionA.clicks).toBe(2);
    expect(sessionA.distinct_pages).toBe(2);

    const sessionB = res.body.data.sessions.find((s) => s.session_id === 'sess-agg-B');
    expect(sessionB).toBeDefined();
    expect(sessionB.total_events).toBe(1);
    expect(sessionB.page_views).toBe(1);
    expect(sessionB.clicks).toBe(0);
  });

  // Test 7: Chronological session event retrieval
  test('7. Chronological session event retrieval via GET /api/sessions/:sessionId/events', async () => {
    const baseTime = Date.now();

    // Insert out of chronological order to verify that server sorts chronologically
    await Event.create([
      {
        session_id: 'sess-chrono-1',
        event_type: 'click',
        page_url: 'http://localhost:5500/cart',
        timestamp: new Date(baseTime + 20000), // Step 3
        click_x: 50,
        click_y: 80,
        viewport_width: 1440,
        viewport_height: 900
      },
      {
        session_id: 'sess-chrono-1',
        event_type: 'page_view',
        page_url: 'http://localhost:5500/home',
        timestamp: new Date(baseTime), // Step 1
        viewport_width: 1440,
        viewport_height: 900
      },
      {
        session_id: 'sess-chrono-1',
        event_type: 'click',
        page_url: 'http://localhost:5500/home',
        timestamp: new Date(baseTime + 10000), // Step 2
        click_x: 200,
        click_y: 350,
        viewport_width: 1440,
        viewport_height: 900
      }
    ]);

    const res = await request(app)
      .get('/api/sessions/sess-chrono-1/events')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.events).toHaveLength(3);

    // Verify strictly ascending timestamps
    const events = res.body.data.events;
    expect(events[0].event_type).toBe('page_view');
    expect(events[0].page_url).toBe('http://localhost:5500/home');
    expect(events[1].event_type).toBe('click');
    expect(events[1].click_x).toBe(200);
    expect(events[2].event_type).toBe('click');
    expect(events[2].page_url).toBe('http://localhost:5500/cart');
  });

  // Test 8: Heatmap page retrieval
  test('8. Distinct heatmap page retrieval via GET /api/heatmap/pages', async () => {
    await Event.create([
      {
        session_id: 'sess-h1',
        event_type: 'click',
        page_url: 'http://localhost:5500/products',
        timestamp: new Date(),
        click_x: 10,
        click_y: 20,
        viewport_width: 1440,
        viewport_height: 900
      },
      {
        session_id: 'sess-h2',
        event_type: 'click',
        page_url: 'http://localhost:5500/deals',
        timestamp: new Date(),
        click_x: 30,
        click_y: 40,
        viewport_width: 1440,
        viewport_height: 900
      },
      {
        session_id: 'sess-h3',
        event_type: 'page_view', // page_view should NOT appear in click pages
        page_url: 'http://localhost:5500/about',
        timestamp: new Date(),
        viewport_width: 1440,
        viewport_height: 900
      }
    ]);

    const res = await request(app)
      .get('/api/heatmap/pages')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.pages).toContain('http://localhost:5500/products');
    expect(res.body.data.pages).toContain('http://localhost:5500/deals');
    expect(res.body.data.pages).not.toContain('http://localhost:5500/about');
  });

  // Test 9: Heatmap click retrieval
  test('9. Heatmap click retrieval via GET /api/heatmap/clicks?pageUrl=...', async () => {
    const targetUrl = 'http://localhost:5500/landing';

    await Event.create([
      {
        session_id: 'sess-c1',
        event_type: 'click',
        page_url: targetUrl,
        timestamp: new Date(),
        click_x: 520,
        click_y: 340,
        viewport_width: 1920,
        viewport_height: 1080
      },
      {
        session_id: 'sess-c2',
        event_type: 'click',
        page_url: targetUrl,
        timestamp: new Date(),
        click_x: 880,
        click_y: 620,
        viewport_width: 1920,
        viewport_height: 1080
      },
      {
        session_id: 'sess-c3',
        event_type: 'click',
        page_url: 'http://localhost:5500/other',
        timestamp: new Date(),
        click_x: 100,
        click_y: 100,
        viewport_width: 1200,
        viewport_height: 800
      }
    ]);

    // Request with valid pageUrl
    const res = await request(app)
      .get(`/api/heatmap/clicks?pageUrl=${encodeURIComponent(targetUrl)}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.total_clicks).toBe(2);
    expect(res.body.data.clicks).toHaveLength(2);
    expect(res.body.data.clicks[0]).toHaveProperty('click_x');
    expect(res.body.data.clicks[0]).toHaveProperty('click_y');
    expect(res.body.data.clicks[0]).toHaveProperty('viewport_width');

    // Rejection when pageUrl is missing
    const missingRes = await request(app)
      .get('/api/heatmap/clicks')
      .expect(400);

    expect(missingRes.body.success).toBe(false);
  });

  // Test 10: Health endpoint behavior
  test('10. Health endpoint returns operational status via GET /api/health', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.database.status).toBe('connected');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
  });

  test('supports session search and the documented pages and heatmap aliases', async () => {
    await Event.create({
      session_id: 'searchable-session', event_type: 'page_view',
      page_url: 'https://example.com/start', timestamp: new Date()
    });
    await Event.create({
      session_id: 'click-session', event_type: 'click', page_url: 'https://example.com/start',
      timestamp: new Date(), x: 10, y: 20, click_x: 10, click_y: 20,
      viewport_width: 100, viewport_height: 100
    });

    const sessions = await request(app).get('/api/sessions?search=searchable').expect(200);
    expect(sessions.body.data.sessions.map((session) => session.session_id)).toEqual(['searchable-session']);

    const pages = await request(app).get('/api/pages').expect(200);
    expect(pages.body.data.pages).toContain('https://example.com/start');

    const heatmap = await request(app)
      .get(`/api/heatmap?url=${encodeURIComponent('https://example.com/start')}`)
      .expect(200);
    expect(heatmap.body.data.clicks[0]).toMatchObject({ x: 10, y: 20 });
  });

  test('returns an empty journey for an unknown session and handles database errors', async () => {
    const unknown = await request(app).get('/api/sessions/not-found/events').expect(200);
    expect(unknown.body.data.events).toEqual([]);
    expect(unknown.body.data.total_events).toBe(0);

    const distinctSpy = jest.spyOn(Event, 'distinct').mockRejectedValueOnce(new Error('database unavailable'));
    const failed = await request(app).get('/api/pages').expect(500);
    expect(failed.body.success).toBe(false);
    expect(failed.body.message).toContain('database unavailable');
    distinctSpy.mockRestore();
  });
});
