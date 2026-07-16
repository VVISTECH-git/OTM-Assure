import React from 'react';

export function Card({ children, style, padding = '1rem 1.25rem' }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding, ...style }}>
      {children}
    </div>
  );
}

export function CardHeader({ title, right, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: subtitle ? 4 : 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function MetricCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 500, color: color || 'var(--text)' }}>{value}</div>
    </div>
  );
}

export function Badge({ children, color = 'gray' }) {
  const map = {
    green:  { bg: 'var(--green-bg)',  fg: 'var(--green)' },
    red:    { bg: 'var(--red-bg)',    fg: 'var(--red)' },
    amber:  { bg: 'var(--amber-bg)', fg: 'var(--amber)' },
    blue:   { bg: 'var(--blue-bg)',  fg: 'var(--blue)' },
    purple: { bg: 'var(--purple-bg)',fg: 'var(--purple)' },
    gray:   { bg: '#f0f0ee',         fg: 'var(--text-muted)' },
  };
  const c = map[color] || map.gray;
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export function Btn({ children, onClick, variant = 'secondary', small, style, icon, disabled }) {
  const base = { display: 'flex', alignItems: 'center', gap: 6, padding: small ? '5px 10px' : '7px 14px', fontSize: 12, borderRadius: 'var(--radius)', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, ...style };
  const variants = {
    primary:   { background: 'var(--brand)', color: 'white' },
    secondary: { background: 'var(--surface)', color: 'var(--text)', border: '0.5px solid var(--border-mid)' },
    danger:    { background: 'var(--red-bg)', color: 'var(--red)', border: '0.5px solid var(--red)' },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 14 }} />}
      {children}
    </button>
  );
}

export function PageHeader({ title, subtitle, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>{subtitle}</p>}
      </div>
      {right && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{right}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, width = 400 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60, zIndex: 100 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border)', padding: '1.25rem', width, maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>
          <i className="ti ti-x" style={{ fontSize: 16, cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, note }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
      {note && <div style={{ fontSize: 11, color: 'var(--text-hint)', marginTop: 3 }}>{note}</div>}
    </div>
  );
}

export function Grid({ cols = 2, gap = 10, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
      {children}
    </div>
  );
}

export function StatusDot({ status }) {
  const color = status === 'pass' || status === 'completed' ? 'var(--green)' : status === 'fail' ? 'var(--red)' : status === 'running' ? 'var(--amber)' : 'var(--text-hint)';
  return <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />;
}
