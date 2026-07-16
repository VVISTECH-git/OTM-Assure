import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Card, PageHeader, Btn, Badge, Modal, Field, Grid } from '../components/Card';

const EMPTY = { name:'', instance_id:'DEV', scenario_ids:['ALL'], frequency:'daily', cron_expr:'0 2 * * *', enabled:true };
const FREQ_CRON = { daily:'0 2 * * *', weekly:'0 6 * * 1', 'on-demand':'', 'post-deploy':'' };

export default function Schedules() {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.schedules.list().then(setList); }, []);

  async function save() {
    setSaving(true);
    await api.schedules.create(form);
    setSaving(false);
    setModal(false);
    api.schedules.list().then(setList);
  }

  async function toggle(s) {
    await api.schedules.update(s.id, { enabled: !s.enabled });
    api.schedules.list().then(setList);
  }

  async function del(id) {
    if (!confirm('Delete schedule?')) return;
    await api.schedules.delete(id);
    api.schedules.list().then(setList);
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHeader title="Schedule Manager" subtitle="Automate regression runs across all instances"
        right={<Btn variant="primary" icon="ti-plus" onClick={() => { setForm(EMPTY); setModal(true); }}>New schedule</Btn>}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.length === 0 && (
          <Card><div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '1rem' }}>No schedules yet. Create one to automate your runs.</div></Card>
        )}
        {list.map(s => (
          <Card key={s.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</span>
                  <Badge color={s.enabled ? 'green' : 'gray'}>{s.enabled ? 'Active' : 'Paused'}</Badge>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {s.instance_id} · {s.frequency} · cron: <code style={{ fontSize: 10 }}>{s.cron_expr}</code>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn small icon={s.enabled ? 'ti-player-pause' : 'ti-player-play'} onClick={() => toggle(s)}>
                  {s.enabled ? 'Pause' : 'Resume'}
                </Btn>
                <Btn small icon="ti-trash" variant="danger" onClick={() => del(s.id)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {modal && (
        <Modal title="New schedule" onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label="Name"><input value={form.name} onChange={f('name')} placeholder="Nightly regression — DEV" style={{ width: '100%' }} /></Field>
            <Grid cols={2}>
              <Field label="Instance">
                <select value={form.instance_id} onChange={f('instance_id')} style={{ width: '100%' }}>
                  {['DEV','TST','UAT','PRD'].map(i => <option key={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Frequency">
                <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value, cron_expr: FREQ_CRON[e.target.value] || '' }))} style={{ width: '100%' }}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="on-demand">On demand</option>
                  <option value="post-deploy">After deployment</option>
                </select>
              </Field>
            </Grid>
            <Field label="Cron expression" note="e.g. 0 2 * * * = every day at 2am">
              <input value={form.cron_expr} onChange={f('cron_expr')} style={{ width: '100%', fontFamily: 'monospace' }} />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Btn onClick={() => setModal(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save schedule'}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
