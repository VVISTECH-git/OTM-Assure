import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Card, PageHeader, Btn, Badge, Modal, Field, Grid } from '../components/Card';

const ROLE_COLOR = { Admin:'amber', Developer:'blue', Tester:'green', Viewer:'gray' };
const INST_COLOR = { DEV:'blue', TST:'amber', UAT:'green', PRD:'red' };
const ROLES = ['Admin','Developer','Tester','Viewer'];
const INSTANCES = ['DEV','TST','UAT','PRD'];
const EMPTY = { name:'', email:'', password:'', role:'Viewer', instances:[] };

const PERMS = [
  ['Manage instances',      true,  false, false, false],
  ['Manage users & roles',  true,  false, false, false],
  ['Create/edit scenarios', true,  true,  false, false],
  ['Run scenarios',         true,  true,  true,  false],
  ['Schedule runs',         true,  true,  false, false],
  ['View live tracking',    true,  true,  true,  true],
  ['View results',          true,  true,  true,  true],
  ['Download reports',      true,  true,  true,  true],
  ['Log defects',           true,  true,  false, false],
  ['View defects',          true,  true,  true,  true],
];

export default function Users() {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.users.list().then(setList); }, []);

  async function save() {
    setSaving(true);
    await api.users.create(form);
    setSaving(false);
    setModal(false);
    api.users.list().then(setList);
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const toggleInst = i => setForm(p => ({ ...p, instances: p.instances.includes(i) ? p.instances.filter(x => x !== i) : [...p.instances, i] }));

  return (
    <div>
      <PageHeader title="Users & Access" subtitle="Role-based access control across all instances"
        right={<Btn variant="primary" icon="ti-plus" onClick={() => { setForm(EMPTY); setModal(true); }}>Invite user</Btn>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '1.25rem' }}>
        {/* User list */}
        <Card padding={0}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Users</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{list.length} members</span>
          </div>
          {list.map(u => {
            const initials = u.name.split(' ').map(n => n[0]).join('').slice(0,2);
            const insts = typeof u.instances === 'string' ? JSON.parse(u.instances) : u.instances;
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem 1rem', borderBottom: '0.5px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{u.name}</span>
                    <Badge color={ROLE_COLOR[u.role] || 'gray'}>{u.role}</Badge>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{u.email}</div>
                  <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                    {insts.map(i => <Badge key={i} color={INST_COLOR[i] || 'gray'}>{i}</Badge>)}
                  </div>
                </div>
                <i className="ti ti-edit" style={{ fontSize: 15, color: 'var(--text-muted)', cursor: 'pointer' }} />
              </div>
            );
          })}
        </Card>

        {/* Permissions matrix */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card padding={0}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--border)', fontSize: 13, fontWeight: 500 }}>Permissions matrix</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  <th style={{ padding: '6px 1rem', textAlign: 'left', fontWeight: 500, color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)' }}>Capability</th>
                  {['Admin','Dev','Tester','Viewer'].map(r => (
                    <th key={r} style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 500, color: r === 'Admin' ? 'var(--amber)' : r === 'Dev' ? 'var(--blue)' : r === 'Tester' ? 'var(--green)' : 'var(--text-muted)', borderBottom: '0.5px solid var(--border)' }}>{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMS.map((p, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg)' }}>
                    <td style={{ padding: '5px 1rem', color: 'var(--text)' }}>{p[0]}</td>
                    {[p[1],p[2],p[3],p[4]].map((v, j) => (
                      <td key={j} style={{ textAlign: 'center', padding: '5px 8px' }}>
                        {v ? <i className="ti ti-circle-check" style={{ fontSize: 14, color: 'var(--green)' }} />
                           : <i className="ti ti-minus" style={{ fontSize: 14, color: 'var(--text-hint)' }} />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>

      {modal && (
        <Modal title="Invite user" onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label="Name"><input value={form.name} onChange={f('name')} style={{ width: '100%' }} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={f('email')} style={{ width: '100%' }} /></Field>
            <Field label="Password"><input type="password" value={form.password} onChange={f('password')} style={{ width: '100%' }} /></Field>
            <Field label="Role">
              <select value={form.role} onChange={f('role')} style={{ width: '100%' }}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Instance access">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {INSTANCES.map(i => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.instances.includes(i)} onChange={() => toggleInst(i)} /> {i}
                  </label>
                ))}
              </div>
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Btn onClick={() => setModal(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Send invite'}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
