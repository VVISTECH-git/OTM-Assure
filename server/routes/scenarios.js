const db = require('../db');

module.exports = function(req, res, url, method, body) {
  const parts = url.replace('/api/scenarios','').split('/').filter(Boolean);
  const id = parts[0];

  if (method === 'GET' && !id) {
    const rows = db.prepare('SELECT * FROM scenarios ORDER BY id').all();
    return res.json(rows.map(r => ({ ...r, instances: JSON.parse(r.instances) })));
  }

  if (method === 'GET' && id && parts[1] === 'steps') {
    const steps = db.prepare('SELECT * FROM scenario_steps WHERE scenario_id=? ORDER BY step_index').all(id);
    return res.json(steps);
  }

  if (method === 'PUT' && id && parts[1] === 'steps') {
    const { steps } = body;
    db.prepare('DELETE FROM scenario_steps WHERE scenario_id=?').run(id);
    const ins = db.prepare('INSERT INTO scenario_steps (scenario_id,step_index,step_name,expected) VALUES (?,?,?,?)');
    (steps || []).forEach((s, i) => ins.run(id, i, s.step_name, s.expected || ''));
    return res.json({ ok: true });
  }

  if (method === 'GET' && id) {
    const row = db.prepare('SELECT * FROM scenarios WHERE id=?').get(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({ ...row, instances: JSON.parse(row.instances) });
  }

  if (method === 'POST' && !id) {
    const { id: newId, name, category, description, script, status, instances } = body;
    if (!newId || !name || !script) return res.status(400).json({ error: 'id, name, script required' });
    db.prepare(`INSERT INTO scenarios (id,name,category,description,script,status,instances) VALUES (?,?,?,?,?,?,?)`)
      .run(newId, name, category||'General', description||'', script, status||'active', JSON.stringify(instances||['DEV']));
    return res.status(201).json({ id: newId });
  }

  if (method === 'PUT' && id) {
    const { name, category, description, script, status, instances } = body;
    db.prepare(`UPDATE scenarios SET name=COALESCE(?,name), category=COALESCE(?,category), description=COALESCE(?,description), script=COALESCE(?,script), status=COALESCE(?,status), instances=COALESCE(?,instances), updated_at=datetime('now') WHERE id=?`)
      .run(name, category, description, script, status, instances ? JSON.stringify(instances) : null, id);
    return res.json({ ok: true });
  }

  if (method === 'DELETE' && id) {
    db.prepare('DELETE FROM scenarios WHERE id=?').run(id);
    return res.json({ ok: true });
  }

  res.status(404).json({ error: 'Route not found' });
};
