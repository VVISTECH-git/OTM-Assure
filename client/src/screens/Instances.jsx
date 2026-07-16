import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Card, PageHeader, Btn, Modal, Field, Grid, Badge } from '../components/Card';

const ENV_BG    = { DEV:'var(--blue-bg)',  TST:'var(--amber-bg)', UAT:'var(--green-bg)', PRD:'var(--red-bg)' };
const ENV_COLOR = { DEV:'var(--blue)',     TST:'var(--amber)',    UAT:'var(--green)',    PRD:'var(--red)' };

const EMPTY = { id:'', label:'', url:'', dba_username:'', dba_password:'', non_dba_username:'', non_dba_password:'', browser:'chrome', element_timeout:60000 };

export default function Instances() {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState('');

  useEffect(() => { load(); }, []);
  function load() { api.instances.list().then(setList); }

  function openAdd() { setForm(EMPTY); setModal('add'); }
  function openEdit(inst) { setForm({ ...inst }); setModal('edit'); }

  async function save() {
    setSaving(true);
    if (modal === 'add') await api.instances.create(form);
    else await api.instances.update(form.id, form);
    setSaving(false);
    setModal(null);
    load();
  }

  async function testConn(id) {
    setTesting(id);
    const r = await api.instances.testConnection(id);
    alert(r.message || (r.success ? 'Connected' : 'Failed'));
    setTesting('');
  }

  async function del(id) {
    if (!confirm(`Delete instance ${id}?`)) return;
    await api.instances.delete(id);
    load();
  }

  const f = (k) => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHeader title="Instance Management" subtitle="Configure OTM connection settings for each environment"
        right={<Btn variant="primary" icon="ti-plus" onClick={openAdd}>Add instance</Btn>} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map(inst => (
          <Card key={inst.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: ENV_BG[inst.id] || '#f0f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: ENV_COLOR[inst.id] || 'var(--text-muted)', flexShrink: 0 }}>
                {inst.id}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{inst.label} — {inst.id}</span>
                  {inst.url ? <Badge color="green"><i className="ti ti-plug" style={{ fontSize: 11 }} /> Connected</Badge>
                            : <Badge color="amber"><i className="ti ti-alert-circle" style={{ fontSize: 11 }} /> Not configured</Badge>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {inst.url || 'URL not set'} &nbsp;·&nbsp; {inst.browser} &nbsp;·&nbsp; {inst.element_timeout}ms timeout
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn small icon="ti-edit" onClick={() => openEdit(inst)}>Edit</Btn>
                <Btn small icon="ti-plug" onClick={() => testConn(inst.id)} disabled={testing === inst.id}>
                  {testing === inst.id ? 'Testing…' : 'Test'}
                </Btn>
                {!['DEV','TST','UAT','PRD'].includes(inst.id) &&
                  <Btn small icon="ti-trash" variant="danger" onClick={() => del(inst.id)} />}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add instance' : `Edit instance — ${form.id}`} onClose={() => setModal(null)} width={440}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Grid cols={2}>
              <Field label="Instance ID (e.g. DEV)">
                <input value={form.id} onChange={f('id')} placeholder="DEV" style={{ width: '100%' }} disabled={modal === 'edit'} />
              </Field>
              <Field label="Label">
                <input value={form.label} onChange={f('label')} placeholder="Development" style={{ width: '100%' }} />
              </Field>
            </Grid>
            <Field label="OTM URL">
              <input value={form.url} onChange={f('url')} placeholder="https://otm-dev.client.com/GC3" style={{ width: '100%' }} />
            </Field>
            <Grid cols={2}>
              <Field label="DBA username">
                <input value={form.dba_username} onChange={f('dba_username')} style={{ width: '100%' }} />
              </Field>
              <Field label="DBA password">
                <input type="password" value={form.dba_password} onChange={f('dba_password')} style={{ width: '100%' }} />
              </Field>
            </Grid>
            <Grid cols={2}>
              <Field label="Browser">
                <select value={form.browser} onChange={f('browser')} style={{ width: '100%' }}>
                  <option value="chrome">Chrome</option>
                  <option value="firefox">Firefox</option>
                  <option value="edge">Edge</option>
                </select>
              </Field>
              <Field label="Element timeout (ms)" note="Maps to EnvironmentConfig.json">
                <input type="number" value={form.element_timeout} onChange={f('element_timeout')} style={{ width: '100%' }} />
              </Field>
            </Grid>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Btn onClick={() => setModal(null)}>Cancel</Btn>
              <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
