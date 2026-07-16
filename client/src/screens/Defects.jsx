import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Card, PageHeader, Btn, Badge, Modal, Field, Grid, MetricCard } from '../components/Card';

const INST_COLOR = { DEV:'blue', TST:'amber', UAT:'green', PRD:'red' };
const PRIORITY_COLOR = { High:'red', Medium:'amber', Low:'gray' };
const EMPTY = { title:'', description:'', priority:'High', instance_id:'DEV', scenario_id:'', assignee:'Unassigned', notes:'' };

export default function Defects() {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [instFilter, setInstFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const runId = params.get('runId');
    const scenarioId = params.get('scenarioId');
    const instance = params.get('instance');
    if (runId && scenarioId) {
      setForm({ ...EMPTY, scenario_id: scenarioId, instance_id: instance || 'DEV', title: `Failure in ${scenarioId} (run ${runId})`, notes: `Run: ${runId}\nScenario: ${scenarioId}` });
      setModal(true);
      navigate('/defects', { replace: true });
    }
  }, []);

  useEffect(() => { load(); }, [instFilter, statusFilter]);

  function load() {
    const p = {};
    if (instFilter) p.instance = instFilter;
    if (statusFilter) p.status = statusFilter;
    api.defects.list(p).then(setList);
  }

  async function save() {
    setSaving(true);
    await api.defects.create(form);
    setSaving(false);
    setModal(false);
    load();
  }

  async function updateStatus(id, status) {
    await api.defects.update(id, { status });
    load();
  }

  const open = list.filter(d => d.status === 'Open').length;
  const inProgress = list.filter(d => d.status === 'In progress').length;
  const resolved = list.filter(d => d.status === 'Resolved').length;
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <PageHeader title="Defect Tracking" subtitle="Defects raised from failed scenario steps"
        right={
          <>
            <select value={instFilter} onChange={e => setInstFilter(e.target.value)} style={{ fontSize: 12, padding: '6px 10px' }}>
              <option value="">All instances</option>
              {['DEV','TST','UAT','PRD'].map(i => <option key={i}>{i}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ fontSize: 12, padding: '6px 10px' }}>
              <option value="">All statuses</option>
              <option>Open</option><option>In progress</option><option>Resolved</option>
            </select>
            <Btn variant="primary" icon="ti-plus" onClick={() => { setForm(EMPTY); setModal(true); }}>Log defect</Btn>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        <MetricCard label="Open" value={open} color="var(--red)" />
        <MetricCard label="In progress" value={inProgress} color="var(--amber)" />
        <MetricCard label="Resolved" value={resolved} color="var(--green)" />
        <MetricCard label="Total" value={list.length} />
      </div>

      <Card padding={0}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 70px 64px 100px 70px 80px', gap: 8, padding: '0.5rem 1rem', background: 'var(--bg)', fontSize: 10, color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)' }}>
          <span>ID</span><span>Title</span><span>Scenario</span><span>Instance</span><span>Status</span><span>Priority</span><span>Raised</span>
        </div>
        {list.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No defects. Great job!</div>}
        {list.map(d => (
          <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 70px 64px 100px 70px 80px', gap: 8, padding: '0.55rem 1rem', borderBottom: '0.5px solid var(--border)', alignItems: 'center', fontSize: 12 }}>
            <span style={{ color: 'var(--brand)', fontWeight: 500 }}>{d.ref}</span>
            <div>
              <div>{d.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.assignee}</div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.scenario_id}</span>
            <Badge color={INST_COLOR[d.instance_id] || 'gray'}>{d.instance_id}</Badge>
            <select value={d.status} onChange={e => updateStatus(d.id, e.target.value)}
              style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '0.5px solid var(--border-mid)', background: d.status === 'Open' ? 'var(--red-bg)' : d.status === 'Resolved' ? 'var(--green-bg)' : 'var(--amber-bg)', color: d.status === 'Open' ? 'var(--red)' : d.status === 'Resolved' ? 'var(--green)' : 'var(--amber)' }}>
              <option>Open</option><option>In progress</option><option>Resolved</option>
            </select>
            <Badge color={PRIORITY_COLOR[d.priority] || 'gray'}>{d.priority}</Badge>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.created_at?.slice(0,10)}</span>
          </div>
        ))}
      </Card>

      {modal && (
        <Modal title="Log defect" onClose={() => setModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label="Title"><input value={form.title} onChange={f('title')} style={{ width: '100%' }} /></Field>
            <Grid cols={2}>
              <Field label="Scenario ID"><input value={form.scenario_id} onChange={f('scenario_id')} placeholder="SC-01" style={{ width: '100%' }} /></Field>
              <Field label="Instance">
                <select value={form.instance_id} onChange={f('instance_id')} style={{ width: '100%' }}>
                  {['DEV','TST','UAT','PRD'].map(i => <option key={i}>{i}</option>)}
                </select>
              </Field>
            </Grid>
            <Grid cols={2}>
              <Field label="Priority">
                <select value={form.priority} onChange={f('priority')} style={{ width: '100%' }}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </select>
              </Field>
              <Field label="Assignee"><input value={form.assignee} onChange={f('assignee')} style={{ width: '100%' }} /></Field>
            </Grid>
            <Field label="Notes"><textarea value={form.notes} onChange={f('notes')} style={{ width: '100%', height: 60, resize: 'none' }} /></Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Btn onClick={() => setModal(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save defect'}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
