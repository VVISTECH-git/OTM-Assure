const db = require('../db');
const { startRun, getSSEClients } = require('../../engine/runner');
const { generateEvidenceDoc } = require('../evidence');
const { v4: uuidv4 } = require('uuid');

module.exports = function(req, res, url, method, body) {
  const parts = url.replace('/api/runs','').split('/').filter(Boolean);
  const id = parts[0];
  const sub = parts[1];

  // SSE live stream: GET /api/runs/stream
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

  // List runs: GET /api/runs
  if (method === 'GET' && !id) {
    const { instance, status, trigger, limit = 50 } = req.query || {};
    let q = 'SELECT * FROM runs WHERE 1=1';
    const params = [];
    if (instance) { q += ' AND instance_id=?'; params.push(instance); }
    if (status)   { q += ' AND status=?'; params.push(status); }
    if (trigger)  { q += ' AND trigger=?'; params.push(trigger); }
    q += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    const rows = db.prepare(q).all(...params);
    return res.json(rows);
  }

  // Get single run + results: GET /api/runs/:id
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

  // Get steps for a scenario in a run: GET /api/runs/:id/steps/:scenarioId
  if (method === 'GET' && id && sub === 'steps') {
    const scenarioId = parts[2];
    const steps = db.prepare('SELECT * FROM run_steps WHERE run_id=? AND scenario_id=? ORDER BY step_index').all(id, scenarioId || '');
    return res.json(steps);
  }

  // Start a new run: POST /api/runs
  if (method === 'POST' && !id) {
    const { instance_id, scenario_ids, triggered_by } = body;
    if (!instance_id) return res.status(400).json({ error: 'instance_id required' });
    const runId = 'RUN-' + Date.now();
    const scIds = scenario_ids && scenario_ids.length > 0 ? scenario_ids : null;
    const allScenarios = db.prepare('SELECT id FROM scenarios WHERE status=? ORDER BY id').all('active').map(r => r.id);
    const finalIds = scIds || allScenarios;
    db.prepare(`INSERT INTO runs (id,instance_id,trigger,triggered_by,scenario_ids,status,total) VALUES (?,?,?,?,?,?,?)`)
      .run(runId, instance_id, triggered_by ? 'Manual' : 'Manual', triggered_by || 'Admin', JSON.stringify(finalIds), 'running', finalIds.length);
    startRun(runId, instance_id, finalIds);
    return res.status(201).json({ runId });
  }

  // Stop a run: POST /api/runs/:id/stop
  // GET /api/runs/:id/evidence.docx — generate Word evidence document
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

  if (method === 'POST' && id && sub === 'stop') {
    db.prepare(`UPDATE runs SET status='stopped', completed_at=datetime('now') WHERE id=? AND status='running'`).run(id);
    return res.json({ ok: true });
  }

  res.status(404).json({ error: 'Route not found' });
};
