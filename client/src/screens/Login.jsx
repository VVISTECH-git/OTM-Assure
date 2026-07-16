import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@otm-assure.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login(email, password);
      if (res.token) {
        localStorage.setItem('otm_token', res.token);
        onLogin(res.user);
        navigate('/instances');
      } else {
        setError(res.error || 'Login failed');
      }
    } catch {
      setError('Server error — is the server running?');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 360 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <i className="ti ti-shield-check" style={{ fontSize: 26, color: 'white' }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Assure</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Confidence after every upgrade</p>
        </div>

        {/* Form */}
        <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: '100%' }} placeholder="admin@otm-assure.com" required />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: '100%' }} placeholder="••••••••" required />
            </div>
            {error && (
              <div style={{ fontSize: 12, color: 'var(--red)', background: 'var(--red-bg)', padding: '8px 12px', borderRadius: 6 }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              style={{ background: 'var(--brand)', color: 'white', border: 'none', borderRadius: 'var(--radius)', padding: '9px', fontSize: 13, fontWeight: 500, marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-hint)', marginTop: 20 }}>
          Powered by Oracle KB45509 Selenium Framework
        </p>
      </div>
    </div>
  );
}
