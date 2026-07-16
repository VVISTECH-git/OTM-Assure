const db = require('../db');

module.exports = function(req, res, url, method, body) {
  // GET /api/testdata/:scenarioId/:instanceId
  // PUT /api/testdata/:scenarioId/:instanceId  { pairs: [{key,value}] }
  const parts = url.replace('/api/testdata','').split('/').filter(Boolean);
  const scenarioId = parts[0];
  const instanceId = parts[1];

  if (method === 'GET' && scenarioId && instanceId) {
    const rows = db.prepare('SELECT key, value FROM test_data WHERE scenario_id=? AND instance_id=? ORDER BY key').all(scenarioId, instanceId);
    return res.json(rows);
  }

  if (method === 'PUT' && scenarioId && instanceId) {
    const { pairs } = body;
    if (!Array.isArray(pairs)) return res.status(400).json({ error: 'pairs array required' });
    const upsert = db.prepare('INSERT INTO test_data (scenario_id,instance_id,key,value) VALUES (?,?,?,?) ON CONFLICT(scenario_id,instance_id,key) DO UPDATE SET value=excluded.value');
    const deleteKey = db.prepare('DELETE FROM test_data WHERE scenario_id=? AND instance_id=? AND key=?');
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM test_data WHERE scenario_id=? AND instance_id=?').run(scenarioId, instanceId);
      for (const { key, value } of pairs) {
        if (key) upsert.run(scenarioId, instanceId, key, value || '');
      }
    });
    tx();
    return res.json({ ok: true });
  }

  // Copy data from one instance to another
  // POST /api/testdata/copy { scenarioId, fromInstance, toInstance }
  if (method === 'POST' && parts[0] === 'copy') {
    const { scenarioId: scId, fromInstance, toInstance } = body;
    const rows = db.prepare('SELECT key, value FROM test_data WHERE scenario_id=? AND instance_id=?').all(scId, fromInstance);
    const upsert = db.prepare('INSERT INTO test_data (scenario_id,instance_id,key,value) VALUES (?,?,?,?) ON CONFLICT(scenario_id,instance_id,key) DO UPDATE SET value=excluded.value');
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM test_data WHERE scenario_id=? AND instance_id=?').run(scId, toInstance);
      for (const { key, value } of rows) upsert.run(scId, toInstance, key, value);
    });
    tx();
    return res.json({ ok: true, copied: rows.length });
  }

  res.status(404).json({ error: 'Route not found' });
};
