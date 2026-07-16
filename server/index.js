const http = require('http');
const path = require('path');
const fs = require('fs');
const url = require('url');

require('./db');

const routeInstances = require('./routes/instances');
const routeScenarios = require('./routes/scenarios');
const routeTestData  = require('./routes/testdata');
const routeRuns      = require('./routes/runs');
const routeDefects   = require('./routes/defects');
const routeAuth      = require('./routes/auth');
const routeUsers     = require('./routes/users');
const routeSchedules = require('./routes/schedules');
const routeNotifications = require('./routes/notifications');
const routeReports       = require('./routes/reports');

const PORT = process.env.PORT || 4000;
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');

function parseBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
  });
}

function parseQuery(rawUrl) {
  const parsed = url.parse(rawUrl, true);
  return parsed.query;
}

const server = http.createServer(async (req, res) => {
  const method = req.method;
  const parsedUrl = url.parse(req.url);
  const pathname = parsedUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  res.json = (data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  res.status = (code) => {
    return { json: (data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); } };
  };
  req.query = parseQuery(req.url);

  if (pathname.startsWith('/api/')) {
    const body = ['POST','PUT','PATCH'].includes(method) ? await parseBody(req) : {};
    req.headers = req.headers || {};

    try {
      if (pathname.startsWith('/api/auth'))      return routeAuth(req, res, pathname, method, body);
      if (pathname.startsWith('/api/instances')) return routeInstances(req, res, pathname, method, body);
      if (pathname.startsWith('/api/scenarios')) return routeScenarios(req, res, pathname, method, body);
      if (pathname.startsWith('/api/testdata'))  return routeTestData(req, res, pathname, method, body);
      if (pathname.startsWith('/api/runs'))      return routeRuns(req, res, pathname, method, body);
      if (pathname.startsWith('/api/defects'))   return routeDefects(req, res, pathname, method, body);
      if (pathname.startsWith('/api/users'))     return routeUsers(req, res, pathname, method, body);
      if (pathname.startsWith('/api/schedules')) return routeSchedules(req, res, pathname, method, body);
      if (pathname.startsWith('/api/notifications')) return routeNotifications(req, res, pathname, method, body);
      if (pathname.startsWith('/api/reports'))       return routeReports(req, res, pathname, method, body);
      return res.status(404).json({ error: 'API route not found' });
    } catch (err) {
      console.error('[API Error]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // Serve React frontend
  const distExists = fs.existsSync(CLIENT_DIST);
  if (distExists) {
    let filePath = path.join(CLIENT_DIST, pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(filePath)) filePath = path.join(CLIENT_DIST, 'index.html');
    const ext = path.extname(filePath);
    const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf', '.eot':'application/vnd.ms-fontobject', '.png':'image/png', '.jpg':'image/jpeg' };
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;">
      <h2>Assure — Server running</h2>
      <p>API is live at <a href="/api/scenarios">/api/scenarios</a></p>
      <p>Build the client with: <code>cd client && npm run build</code></p>
    </body></html>`);
  }
});

server.listen(PORT, () => {
  console.log(`\n🛡  Assure server running on http://localhost:${PORT}`);
  console.log(`   API:    http://localhost:${PORT}/api/scenarios`);
  console.log(`   Login:  admin@otm-assure.com / admin123\n`);
  initSchedules();
});

// Schedule cron jobs for all enabled schedules
const cron = require('node-cron');
const db = require('./db');
let startRun;
try { startRun = require('../engine/runner').startRun; } catch(e) { startRun = () => console.warn('[Engine] Selenium runner not available on this host'); }
const activeCrons = new Map();

function initSchedules() {
  const schedules = db.prepare("SELECT * FROM schedules WHERE enabled=1 AND cron_expr != ''").all();
  for (const s of schedules) registerCron(s);
  console.log(`[Schedules] ${schedules.length} active schedule(s) loaded`);
}

function registerCron(schedule) {
  if (activeCrons.has(schedule.id)) activeCrons.get(schedule.id).stop();
  if (!schedule.enabled || !schedule.cron_expr) return;
  try {
    const job = cron.schedule(schedule.cron_expr, async () => {
      console.log(`[Cron] Firing schedule: ${schedule.name}`);
      const allScenarios = db.prepare('SELECT id FROM scenarios WHERE status=?').all('active').map(r => r.id);
      const scenarioIds = JSON.parse(schedule.scenario_ids || '["ALL"]');
      const ids = scenarioIds.includes('ALL') ? allScenarios : scenarioIds;
      const runId = 'RUN-' + Date.now();
      db.prepare(`INSERT INTO runs (id,instance_id,trigger,triggered_by,scenario_ids,status,total) VALUES (?,?,?,?,?,?,?)`)
        .run(runId, schedule.instance_id, 'Scheduled', schedule.name, JSON.stringify(ids), 'running', ids.length);
      db.prepare(`UPDATE schedules SET last_run_at=datetime('now') WHERE id=?`).run(schedule.id);
      startRun(runId, schedule.instance_id, ids);
    });
    activeCrons.set(schedule.id, job);
  } catch (e) {
    console.error(`[Cron] Invalid cron expression for schedule ${schedule.id}: ${schedule.cron_expr}`);
  }
}

// Export so schedule route can call it when schedules change
module.exports = { registerCron, activeCrons };
