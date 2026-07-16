import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Card, PageHeader, Btn, Modal, Field, Grid, Badge } from '../components/Card';

const CAT_COLOR = {};
const CATS = ['Inbound','Outbound','Finance','Integration','Reporting'];
const INSTANCES = ['DEV','TST','UAT','PRD'];
const EMPTY = { id:'', name:'', category:'Inbound', description:'', script:'', status:'active', instances:['DEV','TST','UAT','PRD'] };

export default function Scenarios({ instance }) {
  const [list, setList] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [filterCat, setFilterCat] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastResults, setLastResults] = useState({});
  const navigate = useNavigate();

  function exportAll() {
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'scenarios.json'; a.click();
  }

  function importFile() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = async e => {
      const text = await e.target.files[0].text();
      const items = JSON.parse(text);
      for (const s of items) await api.scenarios.create(s);
      api.scenarios.list().then(setList);
    };
    input.click();
  }

  useEffect(() => {
    api.scenarios.list().then(setList);
    api.reports.scenarios().then(rows => {
      const map = {};
      for (const r of rows) map[r.id || r.scenario_id] = r;
      setLastResults(map);
    });
  }, []);

  const filtered = list.filter(s => !filterCat || s.category === filterCat);

  function openAdd() { setForm(EMPTY); setModal('add'); }
  function openEdit(s) { setForm({ ...s }); setModal('edit'); }

  async function save() {
    setSaving(true);
    if (modal === 'add') await api.scenarios.create(form);
    else await api.scenarios.update(form.id, form);
    setSaving(false);
    setModal(null);
    api.scenarios.list().then(setList);
  }

  async function del(id) {
    if (!confirm(`Delete scenario ${id}?`)) return;
    await api.scenarios.delete(id);
    api.scenarios.list().then(setList);
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const toggleInst = inst => setForm(p => ({
    ...p, instances: p.instances.includes(inst) ? p.instances.filter(i => i !== inst) : [...p.instances, inst]
  }));

  return (
    <div>
      <PageHeader title="Scenario Registry" subtitle="Manage test scenarios and their linked Oracle test scripts"
        right={
          <>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ fontSize: 12, padding: '6px 10px' }}>
              <option value="">All categories</option>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <Btn icon="ti-upload" onClick={importFile}>Import</Btn>
            <Btn icon="ti-download" onClick={exportAll}>Export all</Btn>
            <Btn variant="primary" icon="ti-plus" onClick={openAdd}>New scenario</Btn>
          </>
        }
      />

      <Card padding={0}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 90px 120px 70px 80px 90px', gap: 8, padding: '0.5rem 1rem', background: 'var(--bg)', fontSize: 10, color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)' }}>
          <span>ID</span><span>Name</span><span>Category</span><span>Script</span><span>Status</span><span>Last result</span><span>Actions</span>
        </div>
        {filtered.map(s => (
          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 90px 120px 70px 80px 90px', gap: 8, padding: '0.55rem 1rem', borderBottom: '0.5px solid var(--border)', alignItems: 'center', fontSize: 12 }}>
            <span style={{ color: 'var(--brand)', fontWeight: 500 }}>{s.id}</span>
            <span>{s.name}</span>
            <Badge color="gray">{s.category}</Badge>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.script}>{s.script}</span>
            <Badge color={s.status === 'active' ? 'green' : 'gray'}>{s.status}</Badge>
            {(() => { const r = lastResults[s.id]; if (!r) return <span style={{ color: 'var(--text-hint)', fontSize: 11 }}>—</span>; const ok = r.last_status === 'pass'; return <Badge color={ok ? 'green' : 'red'}>{ok ? 'Pass' : 'Fail'}</Badge>; })()}
            <div style={{ display: 'flex', gap: 8 }}>
              <i className="ti ti-player-play" style={{ fontSize: 14, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => navigate(`/run?sc=${s.id}`)} title="Run" />
              <i className="ti ti-edit" style={{ fontSize: 14, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => openEdit(s)} title="Edit" />
              <i className="ti ti-database" style={{ fontSize: 14, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => navigate(`/testdata?sc=${s.id}`)} title="Test data" />
              <i className="ti ti-trash" style={{ fontSize: 14, color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => del(s.id)} title="Delete" />
            </div>
          </div>
        ))}
      </Card>

      {modal && (
        <Modal title={modal === 'add' ? 'New scenario' : `Edit ${form.id}`} onClose={() => setModal(null)} width={440}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Grid cols={2}>
              <Field label="Scenario ID"><input value={form.id} onChange={f('id')} placeholder="SC-16" style={{ width: '100%' }} disabled={modal === 'edit'} /></Field>
              <Field label="Category">
                <select value={form.category} onChange={f('category')} style={{ width: '100%' }}>
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </Grid>
            <Field label="Scenario name"><input value={form.name} onChange={f('name')} style={{ width: '100%' }} /></Field>
            <Field label="Description"><textarea value={form.description} onChange={f('description')} style={{ width: '100%', height: 52, resize: 'none' }} /></Field>
            <Field label="Test script (.ts file)" note="Place in C:\OTM-Selenium-Oracle\Tests\SanityBatch\">
              <input value={form.script} onChange={f('script')} placeholder="Test_16_MyScenario.ts" style={{ width: '100%' }} />
            </Field>
            <Field label="Instances">
              <div style={{ display: 'flex', gap: 12 }}>
                {INSTANCES.map(i => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.instances?.includes(i)} onChange={() => toggleInst(i)} /> {i}
                  </label>
                ))}
              </div>
            </Field>
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
