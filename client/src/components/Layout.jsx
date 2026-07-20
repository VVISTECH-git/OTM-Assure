import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const NAV = [
  { to: '/dashboard',  icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { to: '/instances',  icon: 'ti-server',            label: 'Instances' },
  { to: '/scenarios',  icon: 'ti-list-check',        label: 'Scenarios' },
  { to: '/run',        icon: 'ti-player-play',       label: 'Run' },
  { to: '/tracking',   icon: 'ti-activity',          label: 'Live Tracking' },
  { to: '/history',    icon: 'ti-history',           label: 'Run History' },
  { to: '/reports',    icon: 'ti-file-report',       label: 'Reports' },
  { to: '/notifications', icon: 'ti-bell',           label: 'Notifications' },
  { to: '/defects',    icon: 'ti-bug',               label: 'Defects' },
  { to: '/schedules',  icon: 'ti-calendar',          label: 'Schedules' },
  { to: '/users',      icon: 'ti-users',             label: 'Users' },
];

export default function Layout({ user, instance, children }) {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('otm_token');
    navigate('/login');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top bar */}
      <div style={{ background: 'var(--brand)', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ti ti-shield-check" style={{ fontSize: 20, color: 'white' }} />
          <span style={{ fontSize: 16, fontWeight: 500, color: 'white' }}>Assure</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            onClick={() => navigate('/select-instance')}
            style={{ fontSize: 12, background: instance ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', color: 'white', padding: '3px 12px', borderRadius: 6, cursor: 'pointer', border: instance ? 'none' : '1px dashed rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-server" style={{ fontSize: 12 }} />
            {instance ? `${instance.label} — ${instance.id}` : 'Select instance'}
          </span>
          <i className="ti ti-bell" style={{ fontSize: 18, color: 'white', cursor: 'pointer' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={logout}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--brand)' }}>
                {user ? user.name.split(' ').map(n => n[0]).join('').slice(0,2) : 'AD'}
              </span>
            </div>
            <span style={{ fontSize: 13, color: 'white' }}>{user?.name || 'Admin'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 160, background: 'var(--surface)', borderRight: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '0.75rem 0', gap: '2px', flexShrink: 0, overflowY: 'auto' }}>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} title={n.label}
              style={({ isActive }) => ({
                color: isActive ? 'var(--brand)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 14px',
                borderRadius: 6,
                margin: '0 6px',
                background: isActive ? 'rgba(199,70,52,0.08)' : 'transparent',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: isActive ? 500 : 400,
              })}>
              <i className={`ti ${n.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.25rem', background: 'var(--bg)' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
