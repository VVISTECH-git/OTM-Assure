const db = require('../db');
const { generateEvidenceDoc } = require('../evidence');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const fs = require('fs');
const path = require('path');

const INSTANCES_FILE = path.join(__dirname, '..', '..', 'instances', 'instances.json');

let startRun, getSSEClients;
try {
  const runner = require('../../engine/runner');
  startRun = runner.startRun;
  getSSEClients = runner.getSSEClients;
} catch {
  startRun = () => console.warn('[Engine] Selenium runner not available on this host');
  getSSEClients = () => new Map();
}

// ─── GitHub Actions dispatch ──────────────────────────────────────────────────
function dispatchGitHubWorkflow(runId, instanceId, scenarioIds) {
  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO || 'VVISTECH-GIT/OTM-Assure';
  const renderUrl = process.env.RENDER_API_URL || 'https://otm-assure.onrender.com';
  const workflow = 'run-tests.yml';

  const payload = JSON.stringify({
    ref: 'main',
    inputs: {
      run_id:        runId,
      instance_id:   instanceId,
      scenario_ids:  JSON.stringify(scenarioIds),
      render_api_url: renderUrl
    }
  });

  const opts = {
    hostname: 'api.github.com',
    path: `/repos/${repo}/actions/workflows/${workflow}/dispatches`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'OTM-Assure-Portal',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(opts, (resp) => {
      let data = '';
      resp.on('data', d => { data += d; });
      resp.on('end', () => {
        if (resp.statusCode === 204) resolve();
        else reject(new Error(`GitHub API ${resp.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function broadcast(event, data) {
  const clients = getSSEClients();
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients.values()) {
    try { res.write(msg); } catch {}
  }
}

// ─── GHA secret auth helper ───────────────────────────────────────────────────
function isGhaAuthorized(req) {
  const secret = process.env.GHA_SECRET;
  if (!secret) return true; // no secret configured → open (dev mode)
  const auth = (req.headers && req.headers['authorization']) || '';
  return auth === `Bearer ${secret}`;
}

module.exports = function(req, res, url, method, body) {
  const parts = url.replace('/api/runs','').split('/').filter(Boolean);
  const id = parts[0];
  const sub = parts[1];

  // ── GHA callback: GET /api/gha/instance/:instanceId ──────────────────────
  if (method === 'GET' && url.startsWith('/api/gha/instance/')) {
    if (!isGhaAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
    const instId = url.replace('/api/gha/instance/', '');
    let inst = db.prepare('SELECT * FROM instances WHERE id=?').get(instId);
    // Fall back to instances.json if DB row has no URL (Render DB reset on redeploy)
    if (!inst || !inst.url) {
      try {
        const all = JSON.parse(fs.readFileSync(INSTANCES_FILE, 'utf8'));
        const fromFile = all.find(i => i.id === instId);
        if (fromFile && fromFile.url) inst = { ...inst, ...fromFile };
      } catch {}
    }
    if (!inst || !inst.url) return res.status(404).json({ error: 'Instance not found or URL not configured' });
    return res.json(inst);
  }

  // ── GHA callback: GET /api/gha/scenarios ─────────────────────────────────
  if (method === 'GET' && url === '/api/gha/scenarios') {
    if (!isGhaAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
    const rows = db.prepare('SELECT id, name, script FROM scenarios WHERE status=?').all('active');
    return res.json(rows);
  }

  // ── GHA callback: POST /api/gha/runs/:id/screenshot ─────────────────────
  if (method === 'POST' && url.startsWith('/api/gha/runs/') && url.endsWith('/screenshot')) {
    if (!isGhaAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
    const runId = url.replace('/api/gha/runs/', '').replace('/screenshot', '');
    const { scenarioId, stepIndex, data } = body || {};
    if (!scenarioId || stepIndex == null || !data) return res.status(400).json({ error: 'Missing fields' });
    try {
      const dir = path.join(__dirname, '..', '..', 'screenshots', runId, scenarioId);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `step_${stepIndex}.png`), data, 'base64');
    } catch (e) {
      console.error('[Screenshot] Save error:', e.message);
    }
    return res.json({ ok: true });
  }

  // ── GHA callback: POST /api/gha/runs/:id/step ────────────────────────────
  if (method === 'POST' && url.startsWith('/api/gha/runs/') && url.endsWith('/step')) {
    if (!isGhaAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
    const runId = url.replace('/api/gha/runs/', '').replace('/step', '');
    const { scenarioId, stepIndex, status, actual, error: errMsg, durationMs } = body || {};

    const existing = db.prepare(
      'SELECT id FROM run_steps WHERE run_id=? AND scenario_id=? AND step_index=?'
    ).get(runId, scenarioId, stepIndex);

    if (existing) {
      db.prepare(
        `UPDATE run_steps SET status=?, actual=?, error=?, duration_ms=? WHERE run_id=? AND scenario_id=? AND step_index=?`
      ).run(status, actual || null, errMsg || null, durationMs || 0, runId, scenarioId, stepIndex);
    } else {
      const stepName = db.prepare(
        'SELECT step_name FROM scenario_steps WHERE scenario_id=? AND step_index=?'
      ).get(scenarioId, stepIndex);
      db.prepare(
        `INSERT INTO run_steps (run_id,scenario_id,step_index,step_name,status,actual,error,duration_ms) VALUES (?,?,?,?,?,?,?,?)`
      ).run(runId, scenarioId, stepIndex, stepName ? stepName.step_name : `Step ${stepIndex}`, status, actual || null, errMsg || null, durationMs || 0);
    }

    broadcast('step', { runId, scenarioId, stepIndex, status, actual, error: errMsg });
    return res.json({ ok: true });
  }

  // ── GHA callback: POST /api/gha/runs/:id/complete ────────────────────────
  if (method === 'POST' && url.startsWith('/api/gha/runs/') && url.endsWith('/complete')) {
    if (!isGhaAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
    const runId = url.replace('/api/gha/runs/', '').replace('/complete', '');
    const { passed, failed, total, scenario_results } = body || {};
    db.prepare(
      `UPDATE runs SET status='completed', completed_at=datetime('now'), passed=?, failed=?, duration_ms=(strftime('%s','now')-strftime('%s',COALESCE(started_at,created_at)))*1000 WHERE id=?`
    ).run(passed || 0, failed || 0, runId);

    // Update run_results per scenario so dashboard shows correct pass/fail badge
    if (Array.isArray(scenario_results)) {
      for (const { scenarioId, status, durationMs } of scenario_results) {
        db.prepare(`UPDATE run_results SET status=?, completed_at=datetime('now'), duration_ms=? WHERE run_id=? AND scenario_id=?`)
          .run(status, durationMs || 0, runId, scenarioId);
      }
    } else {
      // Fall back: mark all run_results as pass/fail based on run_steps
      const scenarioIds = db.prepare('SELECT DISTINCT scenario_id FROM run_results WHERE run_id=?').all(runId).map(r => r.scenario_id);
      for (const scId of scenarioIds) {
        const failStep = db.prepare(`SELECT id FROM run_steps WHERE run_id=? AND scenario_id=? AND status='fail'`).get(runId, scId);
        const status = failStep ? 'fail' : 'pass';
        db.prepare(`UPDATE run_results SET status=?, completed_at=datetime('now') WHERE run_id=? AND scenario_id=?`)
          .run(status, runId, scId);
      }
    }

    db.prepare(`INSERT INTO alert_log (message, type, run_id) VALUES (?,?,?)`)
      .run(`Run ${runId} completed — ${passed}/${total} passed`, failed > 0 ? 'fail' : 'pass', runId);
    broadcast('run:completed', { runId, passed, failed, total });
    return res.json({ ok: true });
  }

  // ── SSE live stream: GET /api/runs/stream ────────────────────────────────
  if (method === 'GET' && id === 'stream') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();
    const clientId = uuidv4();
    const clients = getSSEClients();
    clients.set(clientId, res);
    req.on('close', () => clients.delete(clientId));
    return;
  }

  // ── List runs: GET /api/runs ──────────────────────────────────────────────
  if (method === 'GET' && !id) {
    const { instance, status, trigger, limit = 50 } = req.query || {};
    let q = 'SELECT * FROM runs WHERE 1=1';
    const params = [];
    if (instance) { q += ' AND instance_id=?'; params.push(instance); }
    if (status)   { q += ' AND status=?'; params.push(status); }
    if (trigger)  { q += ' AND trigger=?'; params.push(trigger); }
    q += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    return res.json(db.prepare(q).all(...params));
  }

  // ── Get single run + results: GET /api/runs/:id ──────────────────────────
  if (method === 'GET' && id && !sub) {
    const run = db.prepare('SELECT * FROM runs WHERE id=?').get(id);
    if (!run) return res.status(404).json({ error: 'Not found' });
    const results = db.prepare('SELECT * FROM run_results WHERE run_id=? ORDER BY scenario_id').all(id);
    const steps = db.prepare('SELECT * FROM run_steps WHERE run_id=? ORDER BY scenario_id, step_index').all(id);
    const scenarioIds = [...new Set(results.map(r => r.scenario_id))];
    const scenarioSteps = scenarioIds.length > 0
      ? db.prepare(`SELECT * FROM scenario_steps WHERE scenario_id IN (${scenarioIds.map(() => '?').join(',')}) ORDER BY scenario_id, step_index`).all(...scenarioIds)
      : [];
    return res.json({ run, results, steps, scenarioSteps });
  }

  // ── Get steps: GET /api/runs/:id/steps/:scenarioId ───────────────────────
  if (method === 'GET' && id && sub === 'steps') {
    const scenarioId = parts[2];
    const steps = db.prepare('SELECT * FROM run_steps WHERE run_id=? AND scenario_id=? ORDER BY step_index').all(id, scenarioId || '');
    return res.json(steps);
  }

  // ── Evidence doc: GET /api/runs/:id/evidence.docx ────────────────────────
  if (method === 'GET' && id && sub === 'evidence.docx') {
    generateEvidenceDoc(id).then(buffer => {
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Evidence-of-Testing-${id}.docx"`,
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    }).catch(err => {
      console.error('[Evidence] Error generating docx:', err.message);
      res.status(500).json({ error: err.message });
    });
    return;
  }

  // ── Start a new run: POST /api/runs ──────────────────────────────────────
  if (method === 'POST' && !id) {
    const { instance_id, scenario_ids, triggered_by } = body;
    if (!instance_id) return res.status(400).json({ error: 'instance_id required' });

    const runId = 'RUN-' + Date.now();
    const allScenarios = db.prepare('SELECT id FROM scenarios WHERE status=? ORDER BY id').all('active').map(r => r.id);
    const finalIds = (scenario_ids && scenario_ids.length > 0) ? scenario_ids : allScenarios;

    db.prepare(`INSERT INTO runs (id,instance_id,trigger,triggered_by,scenario_ids,status,total,started_at) VALUES (?,?,?,?,?,?,?,datetime('now'))`)
      .run(runId, instance_id, 'Manual', triggered_by || 'Admin', JSON.stringify(finalIds), 'running', finalIds.length);

    // Seed scenario run_results rows so the portal shows scenarios immediately
    for (const scId of finalIds) {
      db.prepare(`INSERT OR IGNORE INTO run_results (run_id,scenario_id,status,started_at) VALUES (?,?,?,datetime('now'))`)
        .run(runId, scId, 'running');
    }

    broadcast('run:started', { runId, instanceId: instance_id, total: finalIds.length });

    if (process.env.LOCAL_AGENT === 'true') {
      // Local agent mode: just create the run record, local-agent.js will pick it up
      console.log(`[Runs] Run ${runId} queued — waiting for local agent`);
    } else if (process.env.GITHUB_TOKEN) {
      // Cloud mode: dispatch to GitHub Actions
      dispatchGitHubWorkflow(runId, instance_id, finalIds)
        .then(() => console.log(`[Runs] Dispatched GitHub Actions workflow for ${runId}`))
        .catch(e => {
          console.error('[Runs] GitHub dispatch failed:', e.message);
          db.prepare(`UPDATE runs SET status='failed', completed_at=datetime('now') WHERE id=?`).run(runId);
          broadcast('run:completed', { runId, passed: 0, failed: finalIds.length, total: finalIds.length, error: e.message });
        });
    } else {
      // Local mode: run Selenium directly on this server
      startRun(runId, instance_id, finalIds);
    }

    return res.status(201).json({ runId });
  }

  // ── Stop a run: POST /api/runs/:id/stop ──────────────────────────────────
  if (method === 'POST' && id && sub === 'stop') {
    db.prepare(`UPDATE runs SET status='stopped', completed_at=datetime('now') WHERE id=? AND status='running'`).run(id);
    return res.json({ ok: true });
  }

  res.status(404).json({ error: 'Route not found' });
};
