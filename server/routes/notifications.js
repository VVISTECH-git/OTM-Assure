const db = require('../db');

module.exports = function(req, res, url, method, body) {
  if (method === 'GET') {
    return res.json(db.prepare('SELECT * FROM notifications ORDER BY id').all().map(r => ({
      ...r, channels: JSON.parse(r.channels), enabled: !!r.enabled
    })));
  }
  if (method === 'POST') {
    const { trigger, instance_id, channels, enabled } = body;
    const result = db.prepare('INSERT INTO notifications (trigger,instance_id,channels,enabled) VALUES (?,?,?,?)')
      .run(trigger, instance_id || 'ALL', JSON.stringify(channels || ['Email']), enabled !== false ? 1 : 0);
    return res.status(201).json({ id: result.lastInsertRowid });
  }
  if (method === 'PUT') {
    const id = url.replace('/api/notifications','').split('/').filter(Boolean)[0];
    if (!id) return res.status(400).json({ error: 'id required' });
    const { enabled, channels } = body;
    db.prepare('UPDATE notifications SET enabled=COALESCE(?,enabled), channels=COALESCE(?,channels) WHERE id=?')
      .run(enabled != null ? (enabled ? 1 : 0) : null, channels ? JSON.stringify(channels) : null, id);
    return res.json({ ok: true });
  }
  res.status(404).json({ error: 'Route not found' });
};
