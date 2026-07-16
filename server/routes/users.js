const db = require('../db');
const bcrypt = require('bcryptjs');

module.exports = function(req, res, url, method, body) {
  const parts = url.replace('/api/users','').split('/').filter(Boolean);
  const id = parts[0];

  if (method === 'GET' && !id) {
    const rows = db.prepare('SELECT id,name,email,role,instances,active,last_login,created_at FROM users ORDER BY created_at').all();
    return res.json(rows.map(r => ({ ...r, instances: JSON.parse(r.instances), active: !!r.active })));
  }

  if (method === 'POST' && !id) {
    const { name, email, password, role, instances } = body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`INSERT INTO users (name,email,password,role,instances) VALUES (?,?,?,?,?)`)
      .run(name, email, hash, role||'Viewer', JSON.stringify(instances||[]));
    return res.status(201).json({ id: result.lastInsertRowid });
  }

  if (method === 'PUT' && id) {
    const { name, role, instances, active } = body;
    db.prepare(`UPDATE users SET name=COALESCE(?,name), role=COALESCE(?,role), instances=COALESCE(?,instances), active=COALESCE(?,active) WHERE id=?`)
      .run(name, role, instances ? JSON.stringify(instances) : null, active != null ? (active ? 1 : 0) : null, id);
    return res.json({ ok: true });
  }

  if (method === 'DELETE' && id) {
    db.prepare('DELETE FROM users WHERE id=?').run(id);
    return res.json({ ok: true });
  }

  res.status(404).json({ error: 'Route not found' });
};
