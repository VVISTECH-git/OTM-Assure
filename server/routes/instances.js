const db = require('../db');

module.exports = function(req, res, url, method, body) {
  const parts = url.replace('/api/instances','').split('/').filter(Boolean);
  const id = parts[0];

  if (method === 'GET' && !id) {
    const rows = db.prepare('SELECT * FROM instances ORDER BY id').all();
    return res.json(rows.map(r => ({ ...r, active: !!r.active })));
  }

  if (method === 'GET' && id) {
    const row = db.prepare('SELECT * FROM instances WHERE id=?').get(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({ ...row, active: !!row.active });
  }

  if (method === 'POST' && !id) {
    const { id: newId, label, url: iUrl, dba_username, dba_password, non_dba_username, non_dba_password, browser, element_timeout } = body;
    if (!newId || !label) return res.status(400).json({ error: 'id and label required' });
    db.prepare(`INSERT INTO instances (id,label,url,dba_username,dba_password,non_dba_username,non_dba_password,browser,element_timeout) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(newId.toUpperCase(), label, iUrl||'', dba_username||'', dba_password||'', non_dba_username||'', non_dba_password||'', browser||'chrome', element_timeout||60000);
    return res.status(201).json({ id: newId.toUpperCase() });
  }

  if (method === 'PUT' && id) {
    const { label, url: iUrl, dba_username, dba_password, non_dba_username, non_dba_password, browser, element_timeout, active } = body;
    db.prepare(`UPDATE instances SET label=COALESCE(?,label), url=COALESCE(?,url), dba_username=COALESCE(?,dba_username), dba_password=COALESCE(?,dba_password), non_dba_username=COALESCE(?,non_dba_username), non_dba_password=COALESCE(?,non_dba_password), browser=COALESCE(?,browser), element_timeout=COALESCE(?,element_timeout), active=COALESCE(?,active), updated_at=datetime('now') WHERE id=?`)
      .run(label, iUrl, dba_username, dba_password, non_dba_username, non_dba_password, browser, element_timeout, active != null ? (active ? 1 : 0) : null, id);
    return res.json({ ok: true });
  }

  if (method === 'DELETE' && id) {
    db.prepare('DELETE FROM instances WHERE id=?').run(id);
    return res.json({ ok: true });
  }

  if (method === 'POST' && id && parts[1] === 'test-connection') {
    const inst = db.prepare('SELECT * FROM instances WHERE id=?').get(id);
    if (!inst || !inst.url) return res.json({ success: false, message: 'URL not configured' });
    return res.json({ success: true, message: 'Connection test queued (requires browser)' });
  }

  res.status(404).json({ error: 'Route not found' });
};
