/**
 * OTM-Assure Local Agent
 * Run this on your Windows machine: node engine/local-agent.js
 * It polls the Render portal for pending runs and executes them locally
 * with a visible Chrome browser window.
 */
'use strict';

const https = require('https');
const http = require('http');
const path = require('path');
const fs = require('fs');

const RENDER_API_URL = (process.env.RENDER_API_URL || 'https://otm-assure.onrender.com').replace(/\/$/, '');
const GHA_SECRET = process.env.GHA_SECRET || 'otm-assure-2024';
const POLL_INTERVAL_MS = 5000;

// ─── HTTP helper ──────────────────────────────────────────────────────────────
function apiCall(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const fullUrl = RENDER_API_URL + urlPath;
    const payload = body ? JSON.stringify(body) : null;
    const parsed = new URL(fullUrl);
    const mod = parsed.protocol === 'https:' ? https : http;
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GHA_SECRET}`,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };
    const req = mod.request(opts, (resp) => {
      let data = '';
      resp.on('data', d => { data += d; });
      resp.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Reuse engine/runner logic but post results to Render ────────────────────
const { spawn } = require('child_process');

const ORACLE_PATH = path.join(__dirname, '..', 'oracle');

const STEP_PATTERNS = {
  'SC-01': [
    [l => l.includes('URL -'),               l => `Navigated to: ${l.split('URL - ')[1] || ''}`],
    [l => l.includes('Entering User name'),  () => 'Username entered'],
    [l => l.includes('Entering Password'),   () => 'Password entered'],
    [l => l.includes('Clicking Sign In'),    () => 'Sign In clicked'],
    [l => l.includes('Page title') && l.includes('Transportation'), l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
  ],
  'SC-02': [
    [l => l.includes('Generating order ID'),             l => { const m = l.match(/Generating order ID (\S+)/); return m ? `Order ID: ${m[1]}` : 'Order ID generated'; }],
    [l => l.includes('Uploading XML to WMServlet'),      l => { const m = l.match(/for order (\S+)/); return m ? `Uploading: ${m[1]}` : 'Uploading XML'; }],
    [l => l.includes('WMServlet accepted'),              l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Logging in to OTM'),               l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Switching to TURKEY_PLANNER'),     l => 'Switching to TURKEY_PLANNER role'],
    [l => l.includes('Navigating to Order Management'),  l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Searching for order'),             l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Movement Type verified'),          l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Equipment Type verified'),         l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Buy Itinerary verified'),          l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Fixed Itinerary verified'),        l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('TX2 accepted'),                    l => 'TX2 modification accepted - HTTP 200 OK'],
    [l => l.includes('LDD after TX2 verified'),          l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('TX3 accepted'),                    l => 'TX3 delivery note accepted - HTTP 200 OK'],
    [l => l.includes('Delivery Note Number verified'),   l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Bulk Plan status: COMPLETED'),     l => 'Bulk Plan - Buy: COMPLETED'],
    [l => l.includes('Orders Failed to Plan: 0'),        l => 'Orders Failed to Plan: 0'],
    [l => l.includes('Orders-Planned status:'),          l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Shipment found in Shipments-New'), l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
  ],
};

const STEP_NAMES = {
  'SC-01': ['Load OTM URL', 'Enter username', 'Enter password', 'Click Sign In', 'Verify home page'],
  'SC-02': [
    'Generate test order ID', 'Upload TX1 to WMServlet', 'Verify TX1 accepted',
    'Login to OTM', 'Switch to TURKEY_PLANNER role', 'Navigate to Order Management',
    'Search for TX1 order', 'Verify Movement Type', 'Verify Equipment Type',
    'Verify Buy Itinerary = TURKEY_ITINERARY', 'Verify Fixed Itinerary',
    'Upload TX2 modification', 'Verify TX2 LDD updated',
    'Upload TX3 delivery note', 'Verify Delivery Note Number',
    'Verify Bulk Plan COMPLETED', 'Verify Orders Failed to Plan = 0',
    'Verify order in Orders-Planned', 'Verify shipment in Shipments-New',
  ],
};

function runScenario(runId, scenarioId, scriptFile) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const steps = STEP_NAMES[scenarioId] || ['Login to OTM', 'Execute test', 'Verify result'];
    const patterns = STEP_PATTERNS[scenarioId] || [];

    const scriptPath = path.join(ORACLE_PATH, 'Bin', 'Tests', 'SanityBatch', scriptFile.replace('.ts', '.js'));
    if (!fs.existsSync(scriptPath)) {
      console.error(`[Agent] Script not found: ${scriptPath}`);
      return resolve(false);
    }

    const logFile = path.join(ORACLE_PATH, 'Results', 'SanityBatch', 'Logs', scriptFile.replace('.ts', '.log'));
    let logOffset = 0;
    try { if (fs.existsSync(logFile)) logOffset = fs.statSync(logFile).size; } catch {}

    let nextStep = 0;
    const stepStartTimes = steps.map(() => Date.now());

    function pollLog() {
      if (!fs.existsSync(logFile)) return;
      try {
        const stat = fs.statSync(logFile);
        if (stat.size <= logOffset) return;
        const buf = Buffer.alloc(stat.size - logOffset);
        const fd = fs.openSync(logFile, 'r');
        fs.readSync(fd, buf, 0, buf.length, logOffset);
        fs.closeSync(fd);
        logOffset = stat.size;
        const lines = buf.toString('utf8').split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          if (nextStep >= patterns.length) break;
          const [matchFn, actualFn] = patterns[nextStep];
          if (matchFn(line)) {
            const raw = actualFn(line);
            const actual = (raw && raw.trim()) || steps[nextStep] || `Step ${nextStep} completed`;
            const dur = Date.now() - stepStartTimes[nextStep];
            console.log(`[Agent] Step ${nextStep} PASS: ${actual}`);
            apiCall('POST', `/api/gha/runs/${runId}/step`, {
              scenarioId, stepIndex: nextStep, status: 'pass', actual, durationMs: dur
            }).catch(e => console.warn('[Agent] step post failed:', e.message));

            // Upload screenshot for this step if it exists
            const ssFile = path.join(screenshotsDir, `step_${nextStep}.png`);
            const capturedStep = nextStep;
            setTimeout(() => {
              try {
                if (fs.existsSync(ssFile)) {
                  const data = fs.readFileSync(ssFile).toString('base64');
                  apiCall('POST', `/api/gha/runs/${runId}/screenshot`, {
                    scenarioId, stepIndex: capturedStep, data
                  }).catch(e => console.warn('[Agent] screenshot upload failed:', e.message));
                }
              } catch {}
            }, 2000); // delay so test has time to write the file

            nextStep++;
            if (nextStep < steps.length) stepStartTimes[nextStep] = Date.now();
          }
        }
      } catch {}
    }

    const pollInterval = setInterval(pollLog, 500);

    const screenshotsDir = path.join(__dirname, '..', 'screenshots', runId, scenarioId);
    try { fs.mkdirSync(screenshotsDir, { recursive: true }); } catch {}

    const mochaBin = path.join(__dirname, '..', 'node_modules', '.bin', 'mocha');
    const proc = spawn(mochaBin, ['--no-timeout', '--reporter', 'spec', scriptPath], {
      cwd: ORACLE_PATH,
      shell: true,
      windowsHide: false,
      env: { ...process.env, FORCE_COLOR: '0', SCREENSHOTS_DIR: screenshotsDir }
    });

    let outputBuf = '';
    proc.stdout.on('data', d => { const s = d.toString(); process.stdout.write(s); outputBuf += s; });
    proc.stderr.on('data', d => { const s = d.toString(); process.stderr.write(s); outputBuf += s; });

    proc.on('close', (code) => {
      clearInterval(pollInterval);
      pollLog();
      const durationMs = Date.now() - startTime;
      const success = code === 0;

      if (success) {
        const promises = [];
        for (let i = nextStep; i < steps.length; i++) {
          promises.push(apiCall('POST', `/api/gha/runs/${runId}/step`, {
            scenarioId, stepIndex: i, status: 'pass', actual: null, durationMs: 0
          }));
        }
        // Upload any screenshots not yet uploaded (steps fired during test completion)
        for (let i = 0; i < steps.length; i++) {
          const ssFile = path.join(screenshotsDir, `step_${i}.png`);
          if (fs.existsSync(ssFile)) {
            try {
              const data = fs.readFileSync(ssFile).toString('base64');
              promises.push(apiCall('POST', `/api/gha/runs/${runId}/screenshot`, {
                scenarioId, stepIndex: i, data
              }));
            } catch {}
          }
        }
        Promise.all(promises).catch(() => {}).finally(() => resolve(true));
      } else {
        const errLine = outputBuf.split('\n').find(l => /AssertionError|Error:|TimeoutError|failed/i.test(l)) || 'Test failed';
        const errMsg = errLine.trim().slice(0, 300);
        const promises = [];
        for (let i = nextStep; i < steps.length; i++) {
          const status = i === nextStep ? 'fail' : 'skip';
          promises.push(apiCall('POST', `/api/gha/runs/${runId}/step`, {
            scenarioId, stepIndex: i, status, error: status === 'fail' ? errMsg : null, durationMs: 0
          }));
        }
        Promise.all(promises).catch(() => {}).finally(() => resolve(false));
      }
    });

    proc.on('error', (err) => {
      clearInterval(pollInterval);
      console.error('[Agent] spawn error:', err.message);
      resolve(false);
    });
  });
}

// ─── Main poll loop ───────────────────────────────────────────────────────────
let busy = false;

async function poll() {
  if (busy) return;
  try {
    const runs = await apiCall('GET', '/api/runs?status=running&limit=5');
    if (!Array.isArray(runs)) return;

    for (const run of runs) {
      const scenarioIds = JSON.parse(run.scenario_ids || '[]');
      console.log(`\n[Agent] Picked up run ${run.id} | Instance: ${run.instance_id} | Scenarios: ${scenarioIds.join(', ')}`);
      busy = true;

      // Fetch instance config
      let inst;
      try {
        inst = await apiCall('GET', `/api/gha/instance/${run.instance_id}`);
        if (!inst || !inst.url) throw new Error('No URL');
      } catch (e) {
        console.error('[Agent] Could not fetch instance:', e.message);
        busy = false;
        continue;
      }

      // Write EnvironmentConfig.json
      const envConfig = {
        URL: inst.url, DBA_USERNAME: inst.dba_username, DBA_PASSWORD: inst.dba_password,
        NONDBAUSER: inst.non_dba_username || '', NONDBAPASSWORD: inst.non_dba_password || '',
        BROWSER: 'chrome', ELEMENT_TIMEOUT: inst.element_timeout || 60000
      };
      fs.writeFileSync(path.join(ORACLE_PATH, 'EnvironmentConfig.json'), JSON.stringify(envConfig, null, 2));

      // Fetch scenario list
      let scenarios;
      try {
        scenarios = await apiCall('GET', '/api/gha/scenarios');
      } catch { scenarios = []; }
      const scenarioMap = Object.fromEntries((scenarios || []).map(s => [s.id, s]));

      let passed = 0, failed = 0;
      const scenario_results = [];
      for (const scId of scenarioIds) {
        const sc = scenarioMap[scId];
        if (!sc) { failed++; scenario_results.push({ scenarioId: scId, status: 'fail', durationMs: 0 }); continue; }
        console.log(`\n[Agent] ===== ${scId}: ${sc.name} =====`);
        const scStart = Date.now();
        const ok = await runScenario(run.id, scId, sc.script);
        const scDuration = Date.now() - scStart;
        if (ok) passed++; else failed++;
        scenario_results.push({ scenarioId: scId, status: ok ? 'pass' : 'fail', durationMs: scDuration });
      }

      await apiCall('POST', `/api/gha/runs/${run.id}/complete`, { passed, failed, total: scenarioIds.length, scenario_results });
      console.log(`\n[Agent] Run ${run.id} done — ${passed}/${scenarioIds.length} passed`);
      busy = false;
    }
  } catch (e) {
    console.error('[Agent] Poll error:', e.message);
    busy = false;
  }
}

console.log(`[Agent] Started — polling ${RENDER_API_URL} every ${POLL_INTERVAL_MS / 1000}s`);
console.log('[Agent] Press Ctrl+C to stop\n');
setInterval(poll, POLL_INTERVAL_MS);
poll();
