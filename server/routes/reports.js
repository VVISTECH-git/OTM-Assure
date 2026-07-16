const db = require('../db');

module.exports = function(req, res, url, method, body) {
  const sub = url.replace('/api/reports','').split('/').filter(Boolean)[0];

  // GET /api/reports/scenarios — per-scenario run stats
  if (method === 'GET' && sub === 'scenarios') {
    const { instance } = req.query || {};
    let q = `
      SELECT
        s.id, s.name, s.category,
        COUNT(rr.id) as total_runs,
        SUM(CASE WHEN rr.status='pass' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN rr.status='fail' THEN 1 ELSE 0 END) as failed,
        MAX(r.created_at) as last_run_at,
        (SELECT rr2.status FROM run_results rr2 JOIN runs r2 ON r2.id=rr2.run_id
         WHERE rr2.scenario_id=s.id ${instance ? "AND r2.instance_id=?" : ""}
         ORDER BY r2.created_at DESC LIMIT 1) as last_status
      FROM scenarios s
      LEFT JOIN run_results rr ON rr.scenario_id = s.id
      LEFT JOIN runs r ON r.id = rr.run_id ${instance ? "AND r.instance_id=?" : ""}
      GROUP BY s.id ORDER BY s.id`;
    const params = instance ? [instance, instance] : [];
    return res.json(db.prepare(q).all(...params));
  }

  // GET /api/reports/trend — run trend (last N runs for instance)
  if (method === 'GET' && sub === 'trend') {
    const { instance, limit = 20 } = req.query || {};
    let q = 'SELECT id, created_at, total, passed, failed, duration_ms FROM runs WHERE status=?';
    const params = ['completed'];
    if (instance) { q += ' AND instance_id=?'; params.push(instance); }
    q += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    return res.json(db.prepare(q).all(...params).reverse());
  }

  // GET /api/reports/summary — overall health summary
  if (method === 'GET' && sub === 'summary') {
    const { instance } = req.query || {};
    const q1 = instance
      ? 'SELECT COUNT(*) as c, SUM(passed) as p, SUM(failed) as f FROM runs WHERE status=? AND instance_id=?'
      : 'SELECT COUNT(*) as c, SUM(passed) as p, SUM(failed) as f FROM runs WHERE status=?';
    const params1 = instance ? ['completed', instance] : ['completed'];
    const totals = db.prepare(q1).get(...params1);

    const q2 = instance
      ? 'SELECT * FROM runs WHERE status=? AND instance_id=? ORDER BY created_at DESC LIMIT 1'
      : 'SELECT * FROM runs WHERE status=? ORDER BY created_at DESC LIMIT 1';
    const lastRun = db.prepare(q2).get(...(instance ? ['completed', instance] : ['completed']));

    return res.json({ totalRuns: totals.c, totalPassed: totals.p || 0, totalFailed: totals.f || 0, lastRun });
  }

  // GET /api/reports/dashboard — per-scenario last result for dashboard
  if (method === 'GET' && sub === 'dashboard') {
    const { instance } = req.query || {};
    // For each scenario, get the most recent run result
    const q = `
      SELECT rr.scenario_id, rr.status, rr.duration_ms, r.created_at, r.id as run_id
      FROM run_results rr
      JOIN runs r ON r.id = rr.run_id
      WHERE r.id = (
        SELECT r2.id FROM runs r2
        JOIN run_results rr2 ON rr2.run_id = r2.id AND rr2.scenario_id = rr.scenario_id
        ${instance ? 'WHERE r2.instance_id=?' : ''}
        ORDER BY r2.created_at DESC LIMIT 1
      )
      ${instance ? 'AND r.instance_id=?' : ''}`;
    const params = instance ? [instance, instance] : [];
    try {
      const rows = db.prepare(q).all(...params);
      return res.json(rows);
    } catch {
      // Fallback simpler query
      const q2 = `SELECT rr.scenario_id, rr.status, r.created_at, r.id as run_id
        FROM run_results rr JOIN runs r ON r.id=rr.run_id
        ${instance ? 'WHERE r.instance_id=?' : ''}
        ORDER BY r.created_at DESC`;
      const all = db.prepare(q2).all(...(instance ? [instance] : []));
      const seen = new Set();
      const result = [];
      for (const row of all) {
        if (!seen.has(row.scenario_id)) { seen.add(row.scenario_id); result.push(row); }
      }
      return res.json(result);
    }
  }

  res.status(404).json({ error: 'Reports route not found' });
};
