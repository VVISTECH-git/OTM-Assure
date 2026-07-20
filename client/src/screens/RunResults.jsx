import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Card, PageHeader, Btn, Badge, MetricCard } from '../components/Card';

const STATUS_COLOR = { pass: 'var(--green)', fail: 'var(--red)', skip: 'var(--text-hint)', running: 'var(--amber)' };
const STATUS_ICON  = { pass: 'ti-circle-check', fail: 'ti-alert-circle', skip: 'ti-minus', running: 'ti-loader-2' };

export default function RunResults() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [selectedSc, setSelectedSc] = useState(null);
  const [scNames, setScNames] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.runs.get(id), api.scenarios.list()]).then(([d, scs]) => {
      setData(d);
      const map = {};
      for (const s of scs) map[s.id] = s.name;
      setScNames(map);
      const firstFail = d.results?.find(r => r.status === 'fail');
      setSelectedSc(firstFail?.scenario_id || d.results?.[0]?.scenario_id);
    });
  }, [id]);

  if (!data) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading…</div>;

  const { run, results, steps, scenarioSteps = [] } = data;
  const pct = run.total > 0 ? Math.round(run.passed / run.total * 100) : 0;
  const selectedResult = results.find(r => r.scenario_id === selectedSc);
  const selectedSteps = steps.filter(s => s.scenario_id === selectedSc);

  // Merge run_steps with scenario_steps expected definitions
  const expectedFor = (scId, idx) => scenarioSteps.find(s => s.scenario_id === scId && s.step_index === idx)?.expected || '—';

  function fmt(ms) {
    if (!ms) return '—';
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
        <span style={{ cursor: 'pointer', color: 'var(--brand)' }} onClick={() => navigate('/history')}>Run History</span>
        {' › '}{run.id}
      </div>
      <PageHeader
        title={run.id}
        subtitle={`${run.instance_id} · ${run.trigger} · ${run.created_at?.slice(0,16)} · Duration: ${fmt(run.duration_ms)}`}
        right={<Btn icon="ti-download" onClick={() => { window.location.href = `/api/runs/${run.id}/evidence.docx`; }}>Evidence of Testing</Btn>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.25rem' }}>
        <MetricCard label="Total" value={run.total} />
        <MetricCard label="Passed" value={run.passed} color="var(--green)" />
        <MetricCard label="Failed" value={run.failed} color="var(--red)" />
        <MetricCard label="Pass rate" value={`${pct}%`} color={pct === 100 ? 'var(--green)' : pct >= 80 ? 'var(--amber)' : 'var(--red)'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.25rem' }}>
        {/* Scenario list */}
        <Card padding={0}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--border)', fontSize: 13, fontWeight: 500 }}>Scenarios</div>
          {results.map(r => (
            <div key={r.scenario_id} onClick={() => setSelectedSc(r.scenario_id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 1rem', borderBottom: '0.5px solid var(--border)', cursor: 'pointer', background: r.scenario_id === selectedSc ? 'var(--bg)' : 'transparent' }}>
              <i className={`ti ${STATUS_ICON[r.status] || 'ti-minus'}`} style={{ fontSize: 14, color: STATUS_COLOR[r.status] || 'var(--text-hint)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--brand)' }}>{r.scenario_id}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{scNames[r.scenario_id] || ''}</div>
                <div style={{ fontSize: 10, color: 'var(--text-hint)' }}>{fmt(r.duration_ms)}</div>
              </div>
              <Badge color={r.status === 'pass' ? 'green' : r.status === 'fail' ? 'red' : 'gray'}>
                {r.status === 'pass' ? 'Pass' : r.status === 'fail' ? 'Fail' : r.status}
              </Badge>
            </div>
          ))}
        </Card>

        {/* Evidence table */}
        <Card padding={0}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Test Evidence — {selectedSc}</span>
            {selectedResult && selectedResult.status !== 'running' && (
              <Badge color={selectedResult.status === 'pass' ? 'green' : 'red'}>
                {selectedResult.status === 'pass' ? 'Passed' : 'Failed'}
              </Badge>
            )}
            {selectedResult && selectedResult.status === 'running' && (
              <Badge color="amber">Running</Badge>
            )}
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '32px 130px 1fr 1fr 70px', gap: 0, padding: '0.4rem 1rem', background: 'var(--bg)', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '0.5px solid var(--border)' }}>
            <span></span>
            <span>Step</span>
            <span>Expected</span>
            <span>Actual</span>
            <span style={{ textAlign: 'center' }}>Result</span>
          </div>

          {selectedSteps.length === 0 && (
            <div style={{ padding: '1.5rem 1rem', fontSize: 12, color: 'var(--text-muted)' }}>No step data recorded for this scenario.</div>
          )}

          {selectedSteps.map((s, i) => {
            const isFail = s.status === 'fail';
            const expected = s.expected || expectedFor(s.scenario_id, s.step_index);
            const actual = s.actual || (isFail ? s.error || 'Step did not complete' : '—');
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 130px 1fr 1fr 70px', gap: 0, padding: '0.6rem 1rem', borderBottom: '0.5px solid var(--border)', background: isFail ? 'rgba(163,45,45,0.04)' : 'transparent', alignItems: 'flex-start' }}>
                <i className={`ti ${STATUS_ICON[s.status] || 'ti-minus'}`} style={{ fontSize: 14, color: STATUS_COLOR[s.status] || 'var(--text-hint)', marginTop: 1 }} />
                <div style={{ fontSize: 12, fontWeight: 500, paddingRight: 8 }}>{s.step_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, paddingRight: 8 }}>{expected}</div>
                <div style={{ fontSize: 11, lineHeight: 1.5, color: isFail ? 'var(--red)' : 'var(--text)', paddingRight: 8 }}>
                  {actual}
                  {isFail && s.screenshot && (
                    <div style={{ marginTop: 4 }}>
                      <Btn small icon="ti-photo" onClick={() => window.open(`/uploads/${s.screenshot}`)}>View screenshot</Btn>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Badge color={s.status === 'pass' ? 'green' : s.status === 'fail' ? 'red' : 'gray'} style={{ fontSize: 10 }}>
                    {s.status === 'pass' ? 'Pass' : s.status === 'fail' ? 'Fail' : s.status === 'skip' ? 'Skip' : s.status}
                  </Badge>
                </div>
              </div>
            );
          })}

          {selectedResult?.status === 'fail' && (
            <div style={{ padding: '0.75rem 1rem', borderTop: '0.5px solid var(--border)', display: 'flex', gap: 8 }}>
              <Btn small icon="ti-bug" onClick={() => navigate(`/defects?runId=${run.id}&scenarioId=${selectedSc}&instance=${run.instance_id}`)}>Log defect</Btn>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function exportEvidence(run, results, steps, scenarioSteps) {
  const lines = [
    `OTM ASSURE — TEST EVIDENCE REPORT`,
    `Run: ${run.id}`,
    `Instance: ${run.instance_id}`,
    `Date: ${run.created_at?.slice(0,16)}`,
    `Result: ${run.passed} passed / ${run.failed} failed`,
    ``,
  ];
  for (const r of results) {
    lines.push(`--- ${r.scenario_id} : ${r.status.toUpperCase()} ---`);
    lines.push(`${'Step'.padEnd(25)} ${'Expected'.padEnd(55)} ${'Actual'.padEnd(55)} Result`);
    const sc_steps = steps.filter(s => s.scenario_id === r.scenario_id);
    for (const s of sc_steps) {
      const exp = s.expected || scenarioSteps.find(d => d.scenario_id === s.scenario_id && d.step_index === s.step_index)?.expected || '';
      const act = s.actual || (s.status === 'fail' ? s.error || 'Failed' : 'As expected');
      lines.push(`${s.step_name.padEnd(25)} ${exp.slice(0,54).padEnd(55)} ${act.slice(0,54).padEnd(55)} ${s.status.toUpperCase()}`);
    }
    lines.push('');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${run.id}-evidence.txt`;
  a.click();
}
