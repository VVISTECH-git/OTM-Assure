import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Card, Badge, Btn, PageHeader } from '../components/Card';

export default function LiveTracking({ instance }) {
  const [searchParams] = useSearchParams();
  const [activeRun, setActiveRun] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [steps, setSteps] = useState({});
  const [scenarioStatus, setScenarioStatus] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const [runStatus, setRunStatus] = useState('idle');
  const esRef = useRef(null);
  const timerRef = useRef(null);

  const pollRef = useRef(null);
  const runIdRef = useRef(null);

  useEffect(() => {
    api.scenarios.list().then(setScenarios);
    connectSSE();

    const runId = searchParams.get('runId');
    if (runId) {
      runIdRef.current = runId;
      loadRunState(runId);
      startPolling(runId);
    }

    return () => { esRef.current?.close(); clearInterval(timerRef.current); clearInterval(pollRef.current); };
  }, []);

  async function loadRunState(runId) {
    const data = await api.runs.get(runId);
    if (!data || !data.run) return;
    setActiveRun(data.run);
    const isDone = data.run.status === 'completed' || data.run.status === 'stopped';
    setRunStatus(isDone ? data.run.status : 'running');
    if (!isDone && !timerRef.current) {
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    }
    applyRunData(data);
  }

  function applyRunData(data) {
    if (data.steps && data.steps.length > 0) {
      const byScenario = {};
      for (const s of data.steps) {
        if (!byScenario[s.scenario_id]) byScenario[s.scenario_id] = [];
        byScenario[s.scenario_id].push({ scenarioId: s.scenario_id, stepName: s.step_name, status: s.status, error: s.error });
      }
      setSteps(byScenario);
    }
    if (data.results && data.results.length > 0) {
      const sc = {};
      for (const r of data.results) sc[r.scenario_id] = r.status;
      setScenarioStatus(sc);
    }
  }

  function startPolling(runId) {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const data = await api.runs.get(runId);
      if (!data || !data.run) return;
      applyRunData(data);
      if (data.run.status === 'completed' || data.run.status === 'stopped') {
        setRunStatus(data.run.status);
        clearInterval(pollRef.current);
        clearInterval(timerRef.current);
      }
    }, 2000);
  }

  function connectSSE() {
    if (esRef.current) return;
    const token = localStorage.getItem('otm_token') || '';
    const es = new EventSource(`/api/runs/stream?token=${token}`);
    esRef.current = es;

    es.addEventListener('run:started', e => {
      const d = JSON.parse(e.data);
      setActiveRun(d);
      setRunStatus('running');
      setElapsed(0);
      setSteps({});
      setScenarioStatus({});
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
    });

    es.addEventListener('scenario:started', e => {
      const d = JSON.parse(e.data);
      setScenarioStatus(p => ({ ...p, [d.scenarioId]: 'running' }));
    });

    // Steps are managed by DB polling — SSE step events are intentionally ignored
    // to avoid duplicates when polling and SSE both fire.

    es.addEventListener('scenario:completed', e => {
      const d = JSON.parse(e.data);
      setScenarioStatus(p => ({ ...p, [d.scenarioId]: d.status }));
    });

    es.addEventListener('run:completed', e => {
      setRunStatus('completed');
      clearInterval(timerRef.current);
    });

    es.onerror = () => {};
  }

  function fmt(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  async function stop() {
    const id = activeRun?.runId || activeRun?.id;
    if (id) await api.runs.stop(id);
    setRunStatus('stopped');
    clearInterval(timerRef.current);
    esRef.current?.close();
  }

  const passed = Object.values(scenarioStatus).filter(s => s === 'pass').length;
  const failed = Object.values(scenarioStatus).filter(s => s === 'fail').length;
  const done = passed + failed;
  const total = activeRun?.total || scenarios.length;

  // Only the scenarios that belong to the active run
  const runScenarioIds = (() => { try { return JSON.parse(activeRun?.scenario_ids || '[]'); } catch { return []; } })();
  const runScenarios = runScenarioIds.length > 0 ? scenarios.filter(s => runScenarioIds.includes(s.id)) : scenarios;

  const allStepsList = Object.values(steps).flat();
  const completedSteps = allStepsList.filter(s => s.status === 'pass' || s.status === 'fail' || s.status === 'skip').length;
  const totalSteps = allStepsList.length;
  const pct = totalSteps > 0 ? Math.round(completedSteps / totalSteps * 100) : (total > 0 ? Math.round(done / total * 100) : 0);
  const activeScenario = runScenarios.find(s => scenarioStatus[s.id] === 'running')
    || (runStatus === 'completed' ? runScenarios[runScenarios.length - 1] : null);
  const activeSteps = activeScenario ? (steps[activeScenario.id] || []) : allStepsList;

  return (
    <div>
      <PageHeader
        title="Live Tracking"
        subtitle={
          runStatus === 'running' ? `Run in progress · ${activeRun?.instanceId || instance?.id || ''}` :
          runStatus === 'completed' ? `Run completed — ${passed} passed, ${failed} failed` :
          'No active run'
        }
        right={
          runStatus === 'running'
            ? <Btn icon="ti-player-stop" variant="danger" onClick={stop}>Stop run</Btn>
            : <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Start a run from the Run screen</span>
        }
      />

      {/* Progress bar */}
      <Card style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--text-muted)' }}>Overall progress</span>
          <span style={{ fontWeight: 500 }}>{pct}% &nbsp;·&nbsp; {done} / {total} scenario{total !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ background: 'var(--bg)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: runStatus === 'completed' ? (failed > 0 ? 'var(--red)' : 'var(--green)') : 'var(--brand)', borderRadius: 4, transition: 'width 0.4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11 }}>
          <span style={{ color: 'var(--green)' }}>{passed} passed</span>
          <span style={{ color: 'var(--red)' }}>{failed} failed</span>
          <span style={{ color: 'var(--text-muted)' }}>Elapsed: {fmt(elapsed)}</span>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Scenario list */}
        <Card padding={0}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--border)', fontSize: 13, fontWeight: 500 }}>Scenarios</div>
          {scenarios.length === 0 && (
            <div style={{ padding: '1rem', fontSize: 12, color: 'var(--text-hint)' }}>Loading…</div>
          )}
          {(activeRun?.scenario_ids
            ? scenarios.filter(s => {
                try { return JSON.parse(activeRun.scenario_ids).includes(s.id); } catch { return true; }
              })
            : scenarios
          ).map(s => {
            const st = scenarioStatus[s.id];
            const icon = !st ? 'ti-clock' : st === 'running' ? 'ti-loader-2' : st === 'pass' ? 'ti-circle-check' : 'ti-alert-circle';
            const color = !st ? 'var(--text-hint)' : st === 'running' ? 'var(--amber)' : st === 'pass' ? 'var(--green)' : 'var(--red)';
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 1rem', borderBottom: '0.5px solid var(--border)', background: st === 'running' ? 'rgba(133,79,11,0.05)' : 'transparent' }}>
                <i className={`ti ${icon}`} style={{ fontSize: 15, color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12 }}>{s.name}</span>
                {st === 'pass'    && <Badge color="green">Pass</Badge>}
                {st === 'fail'    && <Badge color="red">Fail</Badge>}
                {st === 'running' && <Badge color="amber">Running</Badge>}
                {!st && <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>Waiting</span>}
              </div>
            );
          })}
        </Card>

        {/* Step log */}
        <Card padding={0} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Step log</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeScenario?.name || (runStatus === 'idle' ? 'Waiting for run…' : 'All steps')}</span>
          </div>
          <div style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', maxHeight: 400 }}>
            {activeSteps.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-hint)', padding: 8 }}>
                {runStatus === 'idle' ? 'Steps will appear here during execution.' : 'Waiting for first step…'}
              </div>
            )}
            {activeSteps.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 8px', background: step.status === 'fail' ? 'rgba(163,45,45,0.06)' : 'var(--bg)', borderRadius: 6 }}>
                <i className={`ti ${step.status === 'pass' ? 'ti-circle-check' : step.status === 'fail' ? 'ti-alert-circle' : step.status === 'skip' ? 'ti-minus' : step.status === 'pending' ? 'ti-circle' : 'ti-loader-2'}`}
                  style={{ fontSize: 14, color: step.status === 'pass' ? 'var(--green)' : step.status === 'fail' ? 'var(--red)' : step.status === 'skip' ? 'var(--text-hint)' : step.status === 'pending' ? 'var(--text-hint)' : 'var(--amber)', marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12 }}>{step.stepName}</div>
                  {step.error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>{step.error}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
