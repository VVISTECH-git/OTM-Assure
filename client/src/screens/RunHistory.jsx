import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Card, PageHeader, Btn, Badge, MetricCard } from '../components/Card';

const INST_COLOR = { DEV:'blue', TST:'amber', UAT:'green', PRD:'red' };

export default function RunHistory() {
  const [runs, setRuns] = useState([]);
  const [instFilter, setInstFilter] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => { load(); }, [instFilter, triggerFilter]);

  function exportCSV() {
    const header = 'Run ID,Instance,Date,Trigger,Total,Passed,Failed,Duration,By';
    const rows = runs.map(r => [r.id, r.instance_id, r.created_at?.slice(0,16), r.trigger, r.total, r.passed, r.failed, r.duration_ms ? Math.round(r.duration_ms/1000)+'s' : '', r.triggered_by].join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'run-history.csv'; a.click();
  }

  function load() {
    const p = { limit: 50 };
    if (instFilter) p.instance = instFilter;
    if (triggerFilter) p.trigger = triggerFilter;
    api.runs.list(p).then(setRuns);
  }

  const total = runs.length;
  const fullPass = runs.filter(r => r.failed === 0).length;
  const withFail = runs.filter(r => r.failed > 0).length;
  const avgDur = runs.length > 0 ? Math.round(runs.reduce((a, r) => a + (r.duration_ms || 0), 0) / runs.length / 60000) : 0;

  function fmt(ms) {
    if (!ms) return '—';
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  }

  return (
    <div>
      <PageHeader title="Run History" subtitle="All past runs — click a run to view step-by-step results"
        right={<Btn icon="ti-download" onClick={exportCSV}>Export CSV</Btn>} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        <MetricCard label="Total runs" value={total} />
        <MetricCard label="100% pass" value={fullPass} color="var(--green)" />
        <MetricCard label="With failures" value={withFail} color="var(--red)" />
        <MetricCard label="Avg duration" value={`${avgDur}m`} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
        <select value={instFilter} onChange={e => setInstFilter(e.target.value)} style={{ fontSize: 12, padding: '6px 10px' }}>
          <option value="">All instances</option>
          {['DEV','TST','UAT','PRD'].map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <select value={triggerFilter} onChange={e => setTriggerFilter(e.target.value)} style={{ fontSize: 12, padding: '6px 10px' }}>
          <option value="">All triggers</option>
          <option value="Manual">Manual</option>
          <option value="Scheduled">Scheduled</option>
        </select>
      </div>

      <Card padding={0}>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 72px 140px 80px 60px 100px 100px 90px 60px', gap: 8, padding: '0.5rem 1rem', background: 'var(--bg)', fontSize: 10, color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)' }}>
          <span>Run ID</span><span>Instance</span><span>Date & time</span><span>Trigger</span><span>Total</span><span>Pass rate</span><span>Duration</span><span>By</span><span></span>
        </div>
        {runs.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No runs yet. Start a run from the Dashboard.</div>
        )}
        {runs.map(r => {
          const pct = r.total > 0 ? Math.round(r.passed / r.total * 100) : 0;
          const pctColor = pct === 100 ? 'var(--green)' : pct >= 80 ? 'var(--amber)' : 'var(--red)';
          return (
            <div key={r.id} onClick={() => navigate(`/results/${r.id}`)}
              style={{ display: 'grid', gridTemplateColumns: '140px 72px 140px 80px 60px 100px 100px 90px 60px', gap: 8, padding: '0.55rem 1rem', borderBottom: '0.5px solid var(--border)', alignItems: 'center', fontSize: 12, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ color: 'var(--brand)', fontWeight: 500 }}>{r.id}</span>
              <Badge color={INST_COLOR[r.instance_id] || 'gray'}>{r.instance_id}</Badge>
              <span style={{ color: 'var(--text-muted)' }}>{r.created_at?.slice(0,16)}</span>
              <Badge color={r.trigger === 'Scheduled' ? 'purple' : 'gray'}>{r.trigger}</Badge>
              <span style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{r.total}</span>
              <span style={{ fontWeight: 500, color: pctColor }}>{pct}% ({r.passed}/{r.total})</span>
              <span style={{ color: 'var(--text-muted)' }}>{fmt(r.duration_ms)}</span>
              <span style={{ color: 'var(--text-muted)' }}>{r.triggered_by}</span>
              <i className="ti ti-eye" style={{ fontSize: 14, color: 'var(--text-muted)' }} />
            </div>
          );
        })}
      </Card>
    </div>
  );
}
