/**
 * GitHub Actions runner — executes Selenium tests and posts results back to the Render portal.
 * Invoked by .github/workflows/run-tests.yml
 *
 * Required env vars:
 *   RUN_ID         — portal run ID (e.g. RUN-1720000000000)
 *   INSTANCE_ID    — OTM instance to test (TST, UAT, etc.)
 *   SCENARIO_IDS   — JSON array string, e.g. '["SC-01","SC-02"]'
 *   RENDER_API_URL — base URL of the portal API (default: https://otm-assure.onrender.com)
 *   GHA_SECRET     — shared secret for callback authentication
 */
'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const RUN_ID        = process.env.RUN_ID;
const INSTANCE_ID   = process.env.INSTANCE_ID;
const SCENARIO_IDS  = JSON.parse(process.env.SCENARIO_IDS || '[]');
const RENDER_API_URL = (process.env.RENDER_API_URL || 'https://otm-assure.onrender.com').replace(/\/$/, '');
const GHA_SECRET    = process.env.GHA_SECRET || '';

if (!RUN_ID || !INSTANCE_ID || !SCENARIO_IDS.length) {
  console.error('[GHA] Missing required env vars: RUN_ID, INSTANCE_ID, SCENARIO_IDS');
  process.exit(1);
}

const ORACLE_PATH = path.join(__dirname, '..', 'oracle');

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

// ─── Step patterns — must mirror engine/runner.js ────────────────────────────
const STEP_PATTERNS = {
  'SC-01': [
    [l => l.includes('URL -'),               l => `Navigated to: ${l.split('URL - ')[1] || ''}`],
    [l => l.includes('Entering User name'),  () => 'Username entered'],
    [l => l.includes('Entering Password'),   () => 'Password entered'],
    [l => l.includes('Clicking Sign In'),    () => 'Sign In clicked'],
    [l => l.includes('Page title') && l.includes('Transportation'), l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
  ],
  'SC-02': [
    [l => l.includes('Generating order ID'),          l => { const m = l.match(/Generating order ID (\S+)/); return m ? `Order ID: ${m[1]}` : 'Order ID generated'; }],
    [l => l.includes('Uploading XML to WMServlet'),   l => { const m = l.match(/for order (\S+)/); return m ? `Uploading: ${m[1]}` : 'Uploading XML'; }],
    [l => l.includes('WMServlet accepted'),           l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Waiting for agent'),            l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Logging in to OTM'),            l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Navigating to Order Management'), l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Searching for order'),          l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Buy Itinerary verified'),       l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Fixed Itinerary verified'),     l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Movement Type verified'),       l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Equipment Type verified'),      l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Order indicator verified'),     l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
  ],
};

// ─── Scenario step names — must mirror engine/runner.js ──────────────────────
const STEP_NAMES = {
  'SC-01': ['Load OTM URL', 'Enter username', 'Enter password', 'Click Sign In', 'Verify home page'],
  'SC-02': [
    'Generate test order ID',
    'Upload XML to WMServlet',
    'Verify WMServlet accepted',
    'Wait for agent processing',
    'Login to OTM',
    'Navigate to Order Release',
    'Search for order',
    'Verify Buy Itinerary = TURKEY_ITINERARY',
    'Verify Fixed Itinerary = TURKEY_TO_ROE',
    'Verify Movement Type = EXPORT',
    'Verify Equipment Type = DRY/REEFER',
    'Verify Order Indicator = W',
  ],
};

// ─── Run one scenario ─────────────────────────────────────────────────────────
function runScenario(runId, instanceId, scenarioId, scriptFile) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const steps = STEP_NAMES[scenarioId] || ['Login to OTM', 'Execute test', 'Verify result'];
    const patterns = STEP_PATTERNS[scenarioId] || [];

    const scriptPath = path.join(ORACLE_PATH, 'Bin', 'Tests', 'SanityBatch', scriptFile.replace('.ts', '.js'));
    if (!fs.existsSync(scriptPath)) {
      console.error(`[GHA] Script not found: ${scriptPath}`);
      apiCall('POST', `/api/gha/runs/${runId}/step`, { scenarioId, stepIndex: 0, status: 'fail', error: `Script not found: ${scriptFile}` }).catch(() => {});
      return resolve(false);
    }

    const logFile = path.join(ORACLE_PATH, 'Results', 'SanityBatch', 'Logs', scriptFile.replace('.ts', '.log'));
    let logOffset = 0;
    try { if (fs.existsSync(logFile)) logOffset = fs.statSync(logFile).size; } catch {}

    let nextStep = 0;
    const stepStartTimes = steps.map(() => Date.now());
    stepStartTimes[0] = Date.now();

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
            const actual = actualFn(line);
            const dur = Date.now() - stepStartTimes[nextStep];
            apiCall('POST', `/api/gha/runs/${runId}/step`, {
              scenarioId, stepIndex: nextStep, status: 'pass', actual, durationMs: dur
            }).catch(e => console.warn('[GHA] step post failed:', e.message));
            nextStep++;
            if (nextStep < steps.length) stepStartTimes[nextStep] = Date.now();
          }
        }
      } catch (e) { console.warn('[GHA] poll error:', e.message); }
    }

    const pollInterval = setInterval(pollLog, 1000);

    const mochaBin = path.join(__dirname, '..', 'node_modules', '.bin', 'mocha');
    const proc = spawn(mochaBin, ['--no-timeout', '--reporter', 'spec', scriptPath], {
      cwd: ORACLE_PATH,
      shell: true,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
        PATH: path.join(__dirname, '..', 'node_modules', '.bin') + ':' + ORACLE_PATH + ':' + (process.env.PATH || '')
      }
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
        // Mark any remaining unmatched steps as pass
        const promises = [];
        for (let i = nextStep; i < steps.length; i++) {
          promises.push(apiCall('POST', `/api/gha/runs/${runId}/step`, {
            scenarioId, stepIndex: i, status: 'pass', actual: null, durationMs: 0
          }));
        }
        Promise.all(promises).catch(() => {}).finally(() => resolve(true));
      } else {
        const errLine = outputBuf.split('\n').find(l => /AssertionError|Error:|TimeoutError|failed/i.test(l)) || 'Test failed';
        const errMsg = errLine.trim().slice(0, 300);
        const promises = [];
        for (let i = nextStep; i < steps.length; i++) {
          const status = (i === nextStep) ? 'fail' : 'skip';
          promises.push(apiCall('POST', `/api/gha/runs/${runId}/step`, {
            scenarioId, stepIndex: i, status, error: status === 'fail' ? errMsg : null, durationMs: 0
          }));
        }
        Promise.all(promises).catch(() => {}).finally(() => resolve(false));
      }
    });

    proc.on('error', (err) => {
      clearInterval(pollInterval);
      console.error('[GHA] spawn error:', err.message);
      resolve(false);
    });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[GHA] Run ${RUN_ID} | Instance ${INSTANCE_ID} | Scenarios: ${SCENARIO_IDS.join(', ')}`);

  // Fetch instance config from portal
  let instanceData;
  try {
    instanceData = await apiCall('GET', `/api/gha/instance/${INSTANCE_ID}`);
    if (!instanceData || !instanceData.url) throw new Error('Instance URL missing');
  } catch (e) {
    console.error('[GHA] Failed to fetch instance config:', e.message);
    process.exit(1);
  }

  // Write EnvironmentConfig.json for the oracle framework
  const envConfig = {
    URL: instanceData.url,
    DBA_USERNAME: instanceData.dba_username,
    DBA_PASSWORD: instanceData.dba_password,
    NONDBAUSER: instanceData.non_dba_username || '',
    NONDBAPASSWORD: instanceData.non_dba_password || '',
    BROWSER: 'chrome',
    ELEMENT_TIMEOUT: instanceData.element_timeout || 60000
  };

  const envConfigPath = path.join(ORACLE_PATH, 'EnvironmentConfig.json');
  fs.mkdirSync(path.dirname(envConfigPath), { recursive: true });
  fs.writeFileSync(envConfigPath, JSON.stringify(envConfig, null, 2), 'utf8');
  console.log('[GHA] EnvironmentConfig.json written');

  // Fetch scenario list for script file names
  let scenarios;
  try {
    scenarios = await apiCall('GET', `/api/gha/scenarios`);
    if (!Array.isArray(scenarios)) throw new Error('Bad scenarios response');
  } catch (e) {
    console.error('[GHA] Failed to fetch scenarios:', e.message);
    process.exit(1);
  }

  const scenarioMap = Object.fromEntries(scenarios.map(s => [s.id, s]));

  let passed = 0;
  let failed = 0;

  for (const scId of SCENARIO_IDS) {
    const sc = scenarioMap[scId];
    if (!sc) { console.warn(`[GHA] Unknown scenario: ${scId}`); failed++; continue; }

    console.log(`\n[GHA] ===== Starting ${scId}: ${sc.name} =====`);
    const ok = await runScenario(RUN_ID, INSTANCE_ID, scId, sc.script);
    if (ok) passed++; else failed++;

    console.log(`[GHA] ${scId}: ${ok ? 'PASS' : 'FAIL'}`);
  }

  // Post completion
  try {
    await apiCall('POST', `/api/gha/runs/${RUN_ID}/complete`, { passed, failed, total: SCENARIO_IDS.length });
    console.log(`\n[GHA] Run ${RUN_ID} completed — ${passed}/${SCENARIO_IDS.length} passed`);
  } catch (e) {
    console.error('[GHA] Failed to post completion:', e.message);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
