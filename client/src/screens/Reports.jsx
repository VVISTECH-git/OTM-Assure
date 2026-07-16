import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Card, PageHeader, Btn, Badge, MetricCard } from '../components/Card';

export default function Reports({ instance }) {
  const [scStats, setScStats] = useState([]);
  const [trend, setTrend] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tab, setTab] = useState('upgrade');
  const navigate = useNavigate();

  useEffect(() => {
    const p = instance ? { instance: instance.id } : {};
    Promise.all([
      api.reports.scenarios(p),
      api.reports.trend({ ...p, limit: 20 }),
      api.reports.summary(p),
    ]).then(([sc, tr, s]) => {
      setScStats(sc);
      setTrend(tr);
      setSummary(s);
    });
  }, [instance]);

  const lastRun = summary?.lastRun;
  const lastPassed = lastRun?.passed || 0;
  const lastTotal = lastRun?.total || scStats.length || 1;
  const pct = Math.round(lastPassed / lastTotal * 100);
  const verdict = pct === 100 ? 'ready' : pct >= 80 ? 'conditional' : 'not-ready';
  const verdictLabel = { ready: 'Ready for go-live', conditional: 'Conditional — review failures before go-live', 'not-ready': 'Not ready — critical failures must be resolved' };
  const verdictColor = { ready: 'var(--green)', conditional: 'var(--amber)', 'not-ready': 'var(--red)' };
  const verdictBg = { ready: 'var(--green-bg)', conditional: 'var(--amber-bg)', 'not-ready': 'var(--red-bg)' };

  const tabs = [
    { id: 'upgrade', label: 'Upgrade readiness' },
    { id: 'trend', label: 'Pass rate trend' },
    { id: 'summary', label: 'Scenario summary' },
  ];

  function fmtDur(ms) {
    if (!ms) return '—';
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function exportPDF() {
    const lines = [
      'OTM ASSURE — UPGRADE READINESS REPORT',
      `Generated: ${new Date().toLocaleString()}`,
      `Instance: ${instance?.id || 'All'}`,
      `Verdict: ${verdictLabel[verdict]}`,
      `Pass rate: ${pct}% (${lastPassed}/${lastTotal} scenarios)`,
      '',
      'SCENARIO RESULTS:',
      scStats.map(s => `  ${s.id.padEnd(8)} ${s.name.padEnd(40)} Last: ${(s.last_status||'—').toUpperCase()}  Runs: ${s.total_runs}  Pass: ${s.passed}/${s.total_runs}`).join('\n'),
      '',
      'RUN HISTORY:',
      trend.map(r => `  ${r.created_at?.slice(0,16)}  ${r.passed}/${r.total} passed  ${fmtDur(r.duration_ms)}`).join('\n'),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `upgrade-readiness-${instance?.id || 'all'}-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Upgrade readiness, trend analysis, and compliance evidence"
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            {instance && <Badge color={({ DEV:'blue', TST:'amber', UAT:'green', PRD:'red' })[instance.id] || 'gray'}>{instance.id}</Badge>}
            <Btn icon="ti-download" onClick={exportPDF}>Export report</Btn>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 'var(--radius)', border: '0.5px solid', cursor: 'pointer', fontFamily: 'inherit', borderColor: t.id === tab ? 'var(--brand)' : 'var(--border-mid)', background: t.id === tab ? 'var(--brand)' : 'var(--surface)', color: t.id === tab ? 'white' : 'var(--text)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'upgrade' && (
        <>
          <div style={{ background: lastRun ? verdictBg[verdict] : 'var(--bg)', border: '0.5px solid', borderColor: lastRun ? verdictColor[verdict] : 'var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'white', border: `2px solid ${lastRun ? verdictColor[verdict] : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: lastRun ? verdictColor[verdict] : 'var(--text-muted)' }}>
                {lastRun ? `${pct}%` : '—'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: lastRun ? verdictColor[verdict] : 'var(--text-muted)' }}>
                  {lastRun ? verdictLabel[verdict] : 'No runs yet for this instance'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  {lastRun ? `Latest run: ${lastRun.created_at?.slice(0,16)} · ${lastPassed}/${lastTotal} scenarios passed · ${fmtDur(lastRun.duration_ms)}` : 'Run scenarios to generate a readiness verdict'}
                </div>
              </div>
            </div>
            <Btn icon="ti-download" onClick={exportPDF}>Download report</Btn>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <Card padding={0}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--border)', fontSize: 13, fontWeight: 500 }}>Scenario status — last run</div>
              {scStats.length === 0 && <div style={{ padding: '1rem', fontSize: 12, color: 'var(--text-muted)' }}>No scenario data yet.</div>}
              {scStats.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 1rem', borderBottom: '0.5px solid var(--border)', fontSize: 12 }}>
                  <i className={`ti ${s.last_status === 'pass' ? 'ti-circle-check' : s.last_status === 'fail' ? 'ti-alert-circle' : 'ti-minus'}`}
                    style={{ fontSize: 14, color: s.last_status === 'pass' ? 'var(--green)' : s.last_status === 'fail' ? 'var(--red)' : 'var(--text-hint)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-muted)', minWidth: 44, fontSize: 11 }}>{s.id}</span>
                  <span style={{ flex: 1 }}>{s.name}</span>
                  {s.last_status
                    ? <Badge color={s.last_status === 'pass' ? 'green' : 'red'}>{s.last_status === 'pass' ? 'Pass' : 'Fail'}</Badge>
                    : <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>Not run</span>}
                </div>
              ))}
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Card>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Readiness checklist</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {[
                    { ok: scStats.filter(s => s.last_status === 'pass').length, total: scStats.length, label: 'Core scenarios verified' },
                    { ok: scStats.filter(s => s.total_runs > 0).length, total: scStats.length, label: 'Scenarios executed at least once' },
                    { ok: scStats.filter(s => s.last_status !== 'fail').length, total: scStats.length, label: 'No open failures' },
                  ].map((item, i) => {
                    const allGood = item.ok === item.total;
                    return (
                      <div key={i} style={{ display: 'flex', gap: 8 }}>
                        <i className={`ti ${allGood ? 'ti-circle-check' : 'ti-alert-circle'}`} style={{ color: allGood ? 'var(--green)' : 'var(--amber)', fontSize: 14, marginTop: 1, flexShrink: 0 }} />
                        <span>{item.ok}/{item.total} — {item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Recent runs</div>
                {trend.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No completed runs yet.</div>}
                {trend.slice(-5).reverse().map(r => {
                  const p = r.total > 0 ? Math.round(r.passed / r.total * 100) : 0;
                  return (
                    <div key={r.id} onClick={() => navigate(`/results/${r.id}`)}
                      style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid var(--border)', fontSize: 12, cursor: 'pointer' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{r.created_at?.slice(0,16)}</span>
                      <span style={{ fontSize: 11 }}>{r.passed}/{r.total}</span>
                      <Badge color={p === 100 ? 'green' : p >= 80 ? 'amber' : 'red'}>{p}%</Badge>
                    </div>
                  );
                })}
              </Card>
            </div>
          </div>
        </>
      )}

      {tab === 'trend' && (
        <Card>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem' }}>Pass rate trend — last {trend.length} runs</div>
          {trend.length < 2 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '1rem 0' }}>Need at least 2 completed runs to show trend. Run more scenarios.</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140, marginBottom: 8 }}>
                {trend.map((r, i) => {
                  const h = r.total > 0 ? Math.round(r.passed / r.total * 100) : 0;
                  const color = h === 100 ? 'var(--green)' : h >= 80 ? 'var(--amber)' : 'var(--red)';
                  return (
                    <div key={i} title={`${r.created_at?.slice(0,10)}: ${h}% (${r.passed}/${r.total})`}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                      onClick={() => navigate(`/results/${r.id}`)}>
                      <div style={{ fontSize: 9, color: 'var(--text-hint)' }}>{h}%</div>
                      <div style={{ width: '100%', height: `${Math.max(h, 3)}%`, background: color, borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-hint)' }}>
                <span>{trend[0]?.created_at?.slice(0,10)}</span>
                <span>← Older runs — Newer runs →</span>
                <span>{trend[trend.length-1]?.created_at?.slice(0,10)}</span>
              </div>
            </>
          )}
        </Card>
      )}

      {tab === 'summary' && (
        <Card padding={0}>
          <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 64px 64px 64px 80px 80px', gap: 8, padding: '0.5rem 1rem', background: 'var(--bg)', fontSize: 10, color: 'var(--text-muted)', borderBottom: '0.5px solid var(--border)' }}>
            <span>ID</span><span>Scenario</span><span style={{textAlign:'center'}}>Runs</span><span style={{textAlign:'center'}}>Passed</span><span style={{textAlign:'center'}}>Failed</span><span style={{textAlign:'center'}}>Pass rate</span><span style={{textAlign:'center'}}>Last result</span>
          </div>
          {scStats.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No scenario data yet.</div>}
          {scStats.map(s => {
            const rate = s.total_runs > 0 ? Math.round(s.passed / s.total_runs * 100) : null;
            return (
              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 64px 64px 64px 80px 80px', gap: 8, padding: '0.45rem 1rem', borderBottom: '0.5px solid var(--border)', fontSize: 12, alignItems: 'center' }}>
                <span style={{ color: 'var(--brand)', fontWeight: 500 }}>{s.id}</span>
                <span>{s.name}</span>
                <span style={{ textAlign:'center', color:'var(--text-muted)' }}>{s.total_runs}</span>
                <span style={{ textAlign:'center', color:'var(--green)' }}>{s.passed}</span>
                <span style={{ textAlign:'center', color: s.failed > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{s.failed}</span>
                <span style={{ textAlign:'center' }}>
                  {rate !== null ? <Badge color={rate === 100 ? 'green' : rate >= 80 ? 'amber' : 'red'}>{rate}%</Badge> : <span style={{color:'var(--text-hint)'}}>—</span>}
                </span>
                <span style={{ textAlign:'center' }}>
                  {s.last_status ? <Badge color={s.last_status === 'pass' ? 'green' : 'red'}>{s.last_status === 'pass' ? 'Pass' : 'Fail'}</Badge> : <span style={{color:'var(--text-hint)'}}>Not run</span>}
                </span>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
