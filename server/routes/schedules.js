const db = require('../db');
let serverModule = null;
function getServer() { if (!serverModule) { try { serverModule = require('../index'); } catch {} } return serverModule; }

module.exports = function(req, res, url, method, body) {
  const parts = url.replace('/api/schedules','').split('/').filter(Boolean);
  const id = parts[0];

  if (method === 'GET' && !id) {
    const rows = db.prepare('SELECT * FROM schedules ORDER BY created_at DESC').all();
    return res.json(rows.map(r => ({ ...r, scenario_ids: JSON.parse(r.scenario_ids), enabled: !!r.enabled })));
  }

  if (method === 'POST' && !id) {
    const { name, instance_id, scenario_ids, frequency, cron_expr, enabled } = body;
    if (!name || !instance_id) return res.status(400).json({ error: 'name and instance_id required' });
    const result = db.prepare(`INSERT INTO schedules (name,instance_id,scenario_ids,frequency,cron_expr,enabled) VALUES (?,?,?,?,?,?)`)
      .run(name, instance_id, JSON.stringify(scenario_ids||['ALL']), frequency||'daily', cron_expr||'', enabled !== false ? 1 : 0);
    const newSchedule = db.prepare('SELECT * FROM schedules WHERE id=?').get(result.lastInsertRowid);
    getServer()?.registerCron?.(newSchedule);
    return res.status(201).json({ id: result.lastInsertRowid });
  }

  if (method === 'PUT' && id) {
    const { name, instance_id, scenario_ids, frequency, cron_expr, enabled } = body;
    db.prepare(`UPDATE schedules SET name=COALESCE(?,name), instance_id=COALESCE(?,instance_id), scenario_ids=COALESCE(?,scenario_ids), frequency=COALESCE(?,frequency), cron_expr=COALESCE(?,cron_expr), enabled=COALESCE(?,enabled) WHERE id=?`)
      .run(name||null, instance_id||null, scenario_ids ? JSON.stringify(scenario_ids) : null, frequency||null, cron_expr||null, enabled != null ? (enabled ? 1 : 0) : null, id);
    const updated = db.prepare('SELECT * FROM schedules WHERE id=?').get(id);
    getServer()?.registerCron?.(updated);
    return res.json({ ok: true });
  }

  if (method === 'DELETE' && id) {
    getServer()?.activeCrons?.get(parseInt(id))?.stop();
    getServer()?.activeCrons?.delete(parseInt(id));
    db.prepare('DELETE FROM schedules WHERE id=?').run(id);
    return res.json({ ok: true });
  }

  res.status(404).json({ error: 'Route not found' });
};
