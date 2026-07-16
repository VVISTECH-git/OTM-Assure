import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Card, PageHeader, Btn, Badge, Modal, Field } from '../components/Card';

const EMPTY = { trigger: 'Any scenario fails', instance_id: 'ALL', channels: ['Email'], enabled: true };
const TRIGGERS = ['Any scenario fails', 'Pass rate drops below 70%', 'Run completes', 'Scheduled run starts'];
const CHANNELS = ['Email', 'Slack', 'SMS'];

export default function Notifications() {
  const [rules, setRules] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadRules(); }, []);

  async function loadRules() {
    const r = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${localStorage.getItem('otm_token')}` } });
    if (r.ok) setRules(await r.json());
  }

  async function saveRule() {
    setSaving(true);
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('otm_token')}` },
      body: JSON.stringify(form)
    });
    setSaving(false);
    setModal(false);
    loadRules();
  }

  async function toggleRule(rule) {
    await fetch(`/api/notifications/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('otm_token')}` },
      body: JSON.stringify({ enabled: !rule.enabled })
    });
    loadRules();
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const toggleChannel = ch => setForm(p => ({
    ...p, channels: p.channels.includes(ch) ? p.channels.filter(c => c !== ch) : [...p.channels, ch]
  }));

  return (
    <div>
      <PageHeader title="Notifications" subtitle="Alert rules and delivery channels for run events"
        right={<Btn variant="primary" icon="ti-plus" onClick={() => { setForm(EMPTY); setModal(true); }}>Add rule</Btn>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Rules */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Alert rules</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rules.length === 0 && (
              <Card><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No notification rules configured yet.</div></Card>
            )}
            {rules.map(r => (
              <Card key={r.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3 }}>{r.trigger}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{r.instance_id}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(typeof r.channels === 'string' ? JSON.parse(r.channels) : r.channels).map(ch => (
                        <span key={ch} style={{ fontSize: 10, background: 'var(--bg)', color: 'var(--text-muted)', borderRadius: 4, padding: '1px 6px' }}>{ch}</span>
                      ))}
                    </div>
                  </div>
                  <Badge color={r.enabled ? 'green' : 'gray'} style={{ cursor: 'pointer' }} onClick={() => toggleRule(r)}>{r.enabled ? 'On' : 'Off'}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Delivery channels</div>
          <Card>
            {[
              { icon: 'ti-mail', name: 'Email', detail: 'Configure email recipients', active: true },
              { icon: 'ti-brand-slack', name: 'Slack', detail: '#otm-assure-alerts', active: true },
              { icon: 'ti-device-mobile', name: 'SMS', detail: 'Not configured', active: false },
            ].map((ch, i) => (
              <div key={ch.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: i > 0 ? '10px 0 0' : '0', borderTop: i > 0 ? '0.5px solid var(--border)' : 'none', marginTop: i > 0 ? 10 : 0 }}>
                <i className={`ti ${ch.icon}`} style={{ fontSize: 18, color: 'var(--text-muted)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{ch.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ch.detail}</div>
                </div>
                {ch.active ? <Badge color="green">Active</Badge> : <Btn small>Configure</Btn>}
              </div>
            ))}
          </Card>
        </div>
      </div>

      {modal && (
        <Modal title="New alert rule" onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label="Trigger event">
              <select value={form.trigger} onChange={f('trigger')} style={{ width: '100%' }}>
                {TRIGGERS.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Instance">
              <select value={form.instance_id} onChange={f('instance_id')} style={{ width: '100%' }}>
                <option value="ALL">All instances</option>
                {['DEV','TST','UAT','PRD'].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="Notify via">
              <div style={{ display: 'flex', gap: 12 }}>
                {CHANNELS.map(ch => (
                  <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.channels.includes(ch)} onChange={() => toggleChannel(ch)} /> {ch}
                  </label>
                ))}
              </div>
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Btn onClick={() => setModal(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={saveRule} disabled={saving}>{saving ? 'Saving…' : 'Save rule'}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
