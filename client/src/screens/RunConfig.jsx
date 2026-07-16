import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Card, PageHeader, Btn, Badge } from '../components/Card';

const CAT_COLOR = { Inbound:'blue', Outbound:'green', Finance:'amber', Integration:'purple', Reporting:'gray' };

export default function RunConfig({ instance }) {
  const [scenarios, setScenarios] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    api.scenarios.list().then(list => {
      const active = list.filter(s => s.status === 'active');
      setScenarios(active);
      const sc = searchParams.get('sc');
      setSelected(sc ? [sc] : active.map(s => s.id));
    });
  }, []);

  function toggle(id) {
    setSelected(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
  }

  function selectAll() { setSelected(scenarios.map(s => s.id)); }
  function clearAll() { setSelected([]); }

  async function startRun() {
    if (!instance) return alert('Select an instance from the top bar first');
    if (selected.length === 0) return alert('Select at least one scenario');
    setLoading(true);
    const res = await api.runs.start(instance.id, selected, 'Admin');
    setLoading(false);
    if (res.runId) navigate(`/tracking?runId=${res.runId}`);
    else alert('Failed to start run: ' + (res.error || 'Unknown error'));
  }

  const cats = [...new Set(scenarios.map(s => s.category))];

  return (
    <div>
      <PageHeader
        title="Run Scenarios"
        subtitle={`Select scenarios to execute on ${instance?.label || '—'} (${instance?.id || 'no instance'})`}
        right={
          <Btn variant="primary" icon="ti-player-play" onClick={startRun} disabled={loading || selected.length === 0}>
            {loading ? 'Starting…' : `Run ${selected.length} scenario${selected.length !== 1 ? 's' : ''}`}
          </Btn>
        }
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        <Btn small onClick={selectAll}>Select all</Btn>
        <Btn small onClick={clearAll}>Clear</Btn>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          {selected.length} of {scenarios.length} selected
        </span>
      </div>

      <Card padding={0}>
        {cats.map(cat => (
          <div key={cat}>
            <div style={{ padding: '0.5rem 1rem', background: 'var(--bg)', fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {cat}
            </div>
            {scenarios.filter(s => s.category === cat).map(s => (
              <div key={s.id}
                onClick={() => toggle(s.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.6rem 1rem', borderBottom: '0.5px solid var(--border)', cursor: 'pointer', background: selected.includes(s.id) ? 'rgba(199,70,52,0.03)' : 'transparent' }}>
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} onClick={e => e.stopPropagation()} />
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--brand)', minWidth: 48 }}>{s.id}</span>
                <span style={{ flex: 1, fontSize: 12 }}>{s.name}</span>
                <Badge color={CAT_COLOR[s.category] || 'gray'}>{s.category}</Badge>
                <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>{s.script}</span>
              </div>
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
}
