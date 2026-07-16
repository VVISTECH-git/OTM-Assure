import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const ENV_COLOR = { DEV: 'var(--blue)', TST: 'var(--amber)', UAT: 'var(--green)', PRD: 'var(--red)' };
const ENV_BG    = { DEV: 'var(--blue-bg)', TST: 'var(--amber-bg)', UAT: 'var(--green-bg)', PRD: 'var(--red-bg)' };
const ENV_ICON  = { DEV: 'ti-code', TST: 'ti-flask', UAT: 'ti-user-check', PRD: 'ti-building-factory' };

export default function InstanceSelect({ onSelectInstance }) {
  const [instances, setInstances] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { api.instances.list().then(setInstances); }, []);

  function select(inst) {
    onSelectInstance(inst);
    navigate('/dashboard');
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 8 }}>
          <i className="ti ti-shield-check" style={{ fontSize: 24, color: 'var(--brand)' }} />
          <span style={{ fontSize: 20, fontWeight: 500 }}>Assure</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Select an OTM instance to work with</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 280px)', gap: '1rem', maxWidth: 600 }}>
        {instances.map(inst => (
          <div key={inst.id}
            onClick={() => select(inst)}
            style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: ENV_BG[inst.id] || '#f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ${ENV_ICON[inst.id] || 'ti-server'}`} style={{ fontSize: 20, color: ENV_COLOR[inst.id] || 'var(--text-muted)' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{inst.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inst.id}</div>
              </div>
            </div>
            {inst.url ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', wordBreak: 'break-all' }}>{inst.url}</div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <i className="ti ti-alert-circle" style={{ fontSize: 13 }} /> URL not configured
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => navigate('/instances')}
        style={{ marginTop: '2rem', background: 'transparent', border: '0.5px solid var(--border-mid)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        <i className="ti ti-settings" style={{ fontSize: 14 }} /> Manage instances
      </button>
    </div>
  );
}
