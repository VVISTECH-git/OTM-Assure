const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'otm-assure-secret-2024';

module.exports = function(req, res, url, method, body) {
  if (method === 'POST' && url === '/api/auth/login') {
    const { email, password } = body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    db.prepare(`UPDATE users SET last_login=datetime('now') WHERE id=?`).run(user.id);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: '8h' });
    const { password: _p, ...userSafe } = user;
    return res.json({ token, user: { ...userSafe, instances: JSON.parse(user.instances) } });
  }

  if (method === 'GET' && url === '/api/auth/me') {
    const auth = req.headers['authorization'] || '';
    const token = auth.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(token, SECRET);
      const user = db.prepare('SELECT * FROM users WHERE id=?').get(decoded.id);
      if (!user) return res.status(401).json({ error: 'User not found' });
      const { password: _p, ...userSafe } = user;
      return res.json({ ...userSafe, instances: JSON.parse(user.instances) });
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }

  res.status(404).json({ error: 'Route not found' });
};
