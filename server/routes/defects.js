const db = require('../db');

module.exports = function(req, res, url, method, body) {
  const parts = url.replace('/api/defects','').split('/').filter(Boolean);
  const id = parts[0];

  if (method === 'GET' && !id) {
    const { instance, status } = req.query || {};
    let q = 'SELECT * FROM defects WHERE 1=1';
    const params = [];
    if (instance && instance !== 'ALL') { q += ' AND instance_id=?'; params.push(instance); }
    if (status) { q += ' AND status=?'; params.push(status); }
    q += ' ORDER BY created_at DESC';
    return res.json(db.prepare(q).all(...params));
  }

  if (method === 'GET' && id) {
    const row = db.prepare('SELECT * FROM defects WHERE id=?').get(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json(row);
  }

  if (method === 'POST' && !id) {
    const { title, description, priority, instance_id, scenario_id, run_id, step_name, screenshot, assignee, notes } = body;
    if (!title || !instance_id || !scenario_id) return res.status(400).json({ error: 'title, instance_id, scenario_id required' });
    const count = db.prepare('SELECT COUNT(*) as c FROM defects').get().c;
    const ref = 'DEF-' + String(count + 1).padStart(3, '0');
    const result = db.prepare(`INSERT INTO defects (ref,title,description,priority,instance_id,scenario_id,run_id,step_name,screenshot,assignee,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(ref, title, description||'', priority||'Medium', instance_id, scenario_id, run_id||null, step_name||null, screenshot||null, assignee||'Unassigned', notes||'');
    return res.status(201).json({ id: result.lastInsertRowid, ref });
  }

  if (method === 'PUT' && id) {
    const { title, description, priority, status, assignee, notes } = body;
    db.prepare(`UPDATE defects SET title=COALESCE(?,title), description=COALESCE(?,description), priority=COALESCE(?,priority), status=COALESCE(?,status), assignee=COALESCE(?,assignee), notes=COALESCE(?,notes), updated_at=datetime('now') WHERE id=?`)
      .run(title, description, priority, status, assignee, notes, id);
    return res.json({ ok: true });
  }

  if (method === 'DELETE' && id) {
    db.prepare('DELETE FROM defects WHERE id=?').run(id);
    return res.json({ ok: true });
  }

  res.status(404).json({ error: 'Route not found' });
};
