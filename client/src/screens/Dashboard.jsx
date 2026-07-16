import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Card, MetricCard, Badge, Btn, PageHeader } from '../components/Card';

const CAT_COLOR = {};
const INST_COLOR = { DEV:'blue', TST:'amber', UAT:'green', PRD:'red' };

export default function Dashboard({ instance }) {
  const [scenarios, setScenarios] = useState([]);
  const [runs, setRuns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [scResults, setScResults] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.scenarios.list().then(setScenarios);
    const p = instance ? { instance: instance.id } : {};
    Promise.all([
      api.runs.list({ ...(instance ? { instance: instance.id } : {}), limit: 10 }),
      api.reports.summary(p),
      api.reports.dashboard(p),
    ]).then(([r, s, d]) => {
      setRuns(r);
      setSummary(s);
      const map = {};
      for (const row of d) map[row.scenario_id] = row;
      setScResults(map);
    });
  }, [instance]);

  const lastRun = runs[0];
  const passed = summary?.totalPassed || 0;
  const failed = summary?.totalFailed || 0;
  const totalRuns = summary?.totalRuns || 0;
  const lastRunPct = lastRun && lastRun.total > 0 ? Math.round(lastRun.passed / lastRun.total * 100) : 0;

  async function runAll() {
    if (!instance) return alert('Select an instance first');
    setLoading(true);
    const res = await api.runs.start(instance.id, [], 'Admin');
    setLoading(false);
    if (res.runId) navigate(`/tracking?runId=${res.runId}`);
    else alert('Failed to start: ' + (res.error || 'Unknown error'));
  }

  function fmtDate(dt) {
    if (!dt) return 'Never';
    return new Date(dt).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  }

  function fmtDur(ms) {
    if (!ms) return '—';
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  return (
    <div>
      <PageHeader
        title={`Dashboard — ${instance?.label || 'No instance selected'}`}
        subtitle={lastRun ? `Last run: ${fmtDate(lastRun.created_at)} · ${lastRun.passed}/${lastRun.total} passed` : 'No runs yet for this instance'}
        right={
          <Btn variant="primary" icon="ti-player-play" onClick={runAll} disabled={loading || !instance}>
            {loading ? 'Starting…' : 'Run all scenarios'}
          </Btn>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        <MetricCard label="Total runs" value={totalRuns} />
        <MetricCard label="Steps passed (all runs)" value={passed} color="var(--green)" />
        <MetricCard label="Steps failed (all runs)" value={failed} color="var(--red)" />
        <MetricCard label="Last run pass rate" value={lastRun ? `${lastRunPct}%` : '—'} color={lastRunPct === 100 ? 'var(--green)' : lastRunPct >= 80 ? 'var(--amber)' : 'var(--red)'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem' }}>
        {/* Scenario table */}
        <Card padding={0}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Scenarios</span>
            <Btn small icon="ti-list-check" onClick={() => navigate('/scenarios')}>Manage</Btn>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 90px 90px 80px 70px', gap: 8, padding: '0.4rem 1rem', background: 'var(--bg)', fontSize: 10, color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)' }}>
            <span>ID</span><span>Scenario</span><span>Category</span><span>Last run</span><span>Last result</span><span>Action</span>
          </div>
          {scenarios.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No scenarios. <span style={{ color: 'var(--brand)', cursor: 'pointer' }} onClick={() => navigate('/scenarios')}>Add one →</span></div>
          )}
          {scenarios.map(s => {
            const res = scResults[s.id];
            return (
              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 90px 90px 80px 70px', gap: 8, padding: '0.5rem 1rem', borderBottom: '0.5px solid var(--border)', alignItems: 'center', fontSize: 12 }}>
                <span style={{ color: 'var(--brand)', fontWeight: 500 }}>{s.id}</span>
                <span style={{ color: 'var(--text)' }}>{s.name}</span>
                <Badge color="gray">{s.category}</Badge>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{res ? fmtDate(res.created_at) : '—'}</span>
                {res
                  ? <Badge color={res.status === 'pass' ? 'green' : 'red'}>{res.status === 'pass' ? 'Pass' : 'Fail'}</Badge>
                  : <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>Not run</span>}
                <button onClick={() => navigate(`/run?sc=${s.id}`)}
                  style={{ fontSize: 11, background: 'transparent', border: '0.5px solid var(--border-mid)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  ▶ Run
                </button>
              </div>
            );
          })}
        </Card>

        {/* Right panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Card>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Recent runs</div>
            {runs.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No runs yet{instance ? ` for ${instance.id}` : ''}.</div>}
            {runs.slice(0, 6).map(r => {
              const pct = r.total > 0 ? Math.round(r.passed / r.total * 100) : 0;
              return (
                <div key={r.id} onClick={() => navigate(`/results/${r.id}`)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '0.5px solid var(--border)', cursor: 'pointer', fontSize: 12 }}>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--brand)', fontSize: 11 }}>{r.id}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmtDate(r.created_at)} · {fmtDur(r.duration_ms)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.passed}/{r.total}</span>
                    <Badge color={r.failed === 0 ? 'green' : 'red'}>{pct}%</Badge>
                  </div>
                </div>
              );
            })}
            {runs.length > 0 && (
              <div style={{ marginTop: 8, textAlign: 'center' }}>
                <span onClick={() => navigate('/history')} style={{ fontSize: 11, color: 'var(--brand)', cursor: 'pointer' }}>View all runs →</span>
              </div>
            )}
          </Card>

          <Card>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Quick actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Btn icon="ti-player-play" onClick={() => navigate('/run')}>Run selected scenarios</Btn>
              <Btn icon="ti-calendar" onClick={() => navigate('/schedules')}>Schedule a run</Btn>
              <Btn icon="ti-file-report" onClick={() => navigate('/reports')}>Upgrade readiness report</Btn>
              <Btn icon="ti-bug" onClick={() => navigate('/defects')}>View defect tracker</Btn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
