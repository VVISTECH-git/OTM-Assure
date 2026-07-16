import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Card, PageHeader, Btn, Field } from '../components/Card';

export default function TestData({ instance }) {
  const [scenarios, setScenarios] = useState([]);
  const [selectedSc, setSelectedSc] = useState(null);
  const [selectedInst, setSelectedInst] = useState(instance?.id || 'DEV');
  const [pairs, setPairs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => { api.scenarios.list().then(list => { setScenarios(list); const sc = searchParams.get('sc'); if (sc) setSelectedSc(sc); else if (list[0]) setSelectedSc(list[0].id); }); }, []);
  useEffect(() => { if (selectedSc && selectedInst) loadData(); }, [selectedSc, selectedInst]);

  async function loadData() {
    const data = await api.testdata.get(selectedSc, selectedInst);
    setPairs(data.length > 0 ? data : [{ key: '', value: '' }]);
  }

  async function save() {
    setSaving(true);
    await api.testdata.save(selectedSc, selectedInst, pairs.filter(p => p.key));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function copyFrom(fromInst) {
    await api.testdata.copy(selectedSc, fromInst, selectedInst);
    loadData();
  }

  function updatePair(i, k, v) {
    setPairs(p => p.map((pair, idx) => idx === i ? { ...pair, [k]: v } : pair));
  }

  function addRow() { setPairs(p => [...p, { key: '', value: '' }]); }
  function removeRow(i) { setPairs(p => p.filter((_, idx) => idx !== i)); }

  const rawPreview = pairs.filter(p => p.key).map(p => `${p.key}=${p.value}`).join('\n');
  const selectedScenario = scenarios.find(s => s.id === selectedSc);

  return (
    <div>
      <PageHeader title="Test Data Manager"
        subtitle="Edit key=value test data per scenario per instance — maps to /Testdata/*.txt"
        right={
          <select value={selectedInst} onChange={e => setSelectedInst(e.target.value)} style={{ fontSize: 12, padding: '6px 10px' }}>
            {['DEV','TST','UAT','PRD'].map(i => <option key={i}>{i}</option>)}
          </select>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem' }}>
        {/* Scenario list */}
        <Card padding={0}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--border)', fontSize: 13, fontWeight: 500 }}>Scenarios</div>
          {scenarios.map(s => (
            <div key={s.id} onClick={() => setSelectedSc(s.id)}
              style={{ padding: '0.55rem 1rem', borderBottom: '0.5px solid var(--border)', cursor: 'pointer', background: s.id === selectedSc ? 'var(--bg)' : 'transparent' }}>
              <div style={{ fontSize: 12, fontWeight: s.id === selectedSc ? 500 : 400, color: s.id === selectedSc ? 'var(--brand)' : 'var(--text)' }}>{s.id}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
            </div>
          ))}
        </Card>

        {/* Editor */}
        <Card padding={0} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{selectedSc} — {selectedScenario?.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{selectedScenario?.script?.replace('.ts','.txt')} · {selectedInst}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <select onChange={e => e.target.value && copyFrom(e.target.value)} value="" style={{ fontSize: 11, padding: '4px 8px' }}>
                <option value="">Copy from…</option>
                {['DEV','TST','UAT','PRD'].filter(i => i !== selectedInst).map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <Btn small icon="ti-plus" onClick={addRow}>Add key</Btn>
              <Btn small variant="primary" icon="ti-device-floppy" onClick={save} disabled={saving}>
                {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save'}
              </Btn>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: 8, padding: '0.4rem 1rem', background: 'var(--bg)', fontSize: 10, color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)' }}>
            <span>Key</span><span>Value</span><span></span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 300 }}>
            {pairs.map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: 8, padding: '0.4rem 1rem', borderBottom: '0.5px solid var(--border)', alignItems: 'center' }}>
                <input value={p.key} onChange={e => updatePair(i, 'key', e.target.value)} placeholder="KEY_NAME" style={{ fontFamily: 'monospace', fontSize: 12 }} />
                <input value={p.value} onChange={e => updatePair(i, 'value', e.target.value)} placeholder="value" style={{ fontSize: 12 }} />
                <i className="ti ti-trash" style={{ fontSize: 14, color: 'var(--text-hint)', cursor: 'pointer' }} onClick={() => removeRow(i)} />
              </div>
            ))}
          </div>

          <div style={{ padding: '0.75rem 1rem', borderTop: '0.5px solid var(--border)', background: 'var(--bg)' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Raw file preview</div>
            <pre style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{rawPreview || '# No keys defined yet'}</pre>
          </div>
        </Card>
      </div>
    </div>
  );
}
