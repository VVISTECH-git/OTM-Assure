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
    // Phase 1 — TX1
    [l => l.includes('Generating order ID'),            l => { const m = l.match(/Generating order ID (\S+)/); return m ? `Order ID: ${m[1]}` : 'Order ID generated'; }],
    [l => l.includes('Uploading XML to WMServlet'),     l => { const m = l.match(/for order (\S+)/); return m ? `Uploading TX1: ${m[1]}` : 'Uploading TX1'; }],
    [l => l.includes('WMServlet accepted order'),       () => 'TX1 accepted — HTTP 200 OK'],
    // Phase 2 — Login + role
    [l => l.includes('Logging in to OTM'),              () => 'Logging in as LEL7597_TMS'],
    [l => l.includes('Role switched to TURKEY_PLANNER'),() => 'Switched to TURKEY_PLANNER role'],
    // Phase 3 — Order verification
    [l => l.includes('Navigating to Order Management'), () => 'Navigating to Orders - New'],
    [l => l.includes('Movement Type verified'),         l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Equipment Type verified'),        l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('LDD verified:'),                  l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Buy Itinerary verified'),         l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Fixed Itinerary verified'),       l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    // Phase 4 — TX2
    [l => l.includes('Posting TX2 modification'),       l => { const m = l.match(/for TMS\.(\S+) with RDD (\S+)/); return m ? `TX2: order ${m[1]}, RDD ${m[2]}` : 'Posting TX2'; }],
    [l => l.includes('TX2 accepted'),                   () => 'TX2 accepted — HTTP 200 OK'],
    [l => l.includes('LDD after TX2 verified'),         l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    // Phase 5 — TX3
    [l => l.includes('Posting TX3 delivery note'),      l => { const m = l.match(/DN (\S+)/); return m ? `TX3 delivery note DN ${m[1]}` : 'Posting TX3'; }],
    [l => l.includes('TX3 accepted'),                   () => 'TX3 accepted — HTTP 200 OK'],
    // Phase 6 — Orders Unplanned (appears in log BEFORE delivery note verification)
    [l => l.includes('Order found in Orders - Unplanned'), () => 'Order found in Orders - Unplanned bucket'],
    [l => l.includes('Delivery Note Number verified'),  l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('LDD after TX3 verified'),         l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    // Phase 7-8 — Bulk Plan
    [l => l.includes('Bulk Plan - Buy clicked'),        () => 'Bulk Plan initiated'],
    [l => l.includes('Bulk Plan status: COMPLETED'),    () => 'Bulk Plan completed — 0 orders failed'],
    [l => l.includes('Shipment ID captured'),           l => { const m = l.match(/captured: (TMS\.\S+)/); return m ? `Shipment created: ${m[1]}` : 'Shipment ID captured'; }],
    // Phase 9 — Planned status
    [l => l.includes('Orders-Planned status'),          l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    // Phase 10 — Approve for Execution
    [l => l.includes('Shipment found in Shipments-New'), l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Approve for Execution clicked'),  () => 'Approve for Execution clicked'],
    [l => l.includes('Approve for Execution popup closed'), () => 'Approve for Execution — done'],
    // Phase 11 — Sent to Carrier
    [l => l.includes('Shipment in Sent-to-Carrier'),    l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Indicator: Orange found'),        () => 'Orange indicator confirmed'],
    // Phase 12 — Sign out
    [l => l.includes('Sign out verified'),              () => 'LEL7597_TMS signed out'],
    // Phase 13 — Carrier Portal
    [l => l.includes('Carrier logged in'),              () => 'TR_TST_CARRIER logged in'],
    [l => l.includes('Shipments - Review finder loaded'),() => 'Navigated to Shipments - Review'],
    [l => l.includes('Phase 13 Step 113: Checkbox clicked'), l => { const m = l.match(/clicked: (TMS\.\S+)/); return m ? `Shipment selected: ${m[1]}` : 'Shipment checkbox selected'; }],
    [l => l.includes('Phase 13 Step 116: Driver Name'), l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Phase 13 Step 117: Trailer'),     l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Phase 13 Step 118: Truck'),       l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Phase 13 Step 119: Driver Phone'),l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Phase 13 Step 120: Appointment'), l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Phase 13 Step 121: Carrier Remarks'), l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Phase 13 Saving complete: true'), () => 'Mass Update saved ✓'],
    [l => l.includes('Phase 13 Driver Name: FOUND'),    () => 'Driver Name verified ✓'],
    [l => l.includes('Phase 13 Trailer Number: FOUND'), () => 'Trailer Number verified ✓'],
    [l => l.includes('Phase 13 Truck Number: FOUND'),   () => 'Truck Number verified ✓'],
    [l => l.includes('Phase 13 Driver Phone: FOUND'),   () => 'Driver Phone verified ✓'],
    [l => l.includes('Phase 13 Appointment Time: FOUND'),() => 'Appointment Time verified ✓'],
    [l => l.includes('Phase 13 Carrier Remarks: FOUND'),() => 'Carrier Remarks verified ✓'],
    // Phase 14 — KHC_WAREHOUSE
    [l => l.includes('Phase 14: Role switched to KHC_WAREHOUSE'), () => 'Switched to KHC_WAREHOUSE role'],
    [l => l.includes('Phase 14: mainIFrame ready: true'),          () => 'Shipments page loaded'],
    [l => l.includes('Phase 14: Shipment') && l.includes('searched'), l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Phase 14a: Upload Document clicked'),        () => 'Upload Document opened'],
    [l => l.includes('Phase 14a: Upload result'),                  () => 'Batch List uploaded successfully ✓'],
    [l => l.includes('Phase 14a: Submit result'),                  () => 'Document type set to BATCH_LIST ✓'],
    // Phase 14g — SmartLinks → Documents verification (patterns match both success and skip/failure)
    [l => l.includes('Phase 14g: SmartLinks Documents clicked'),       l => l.includes(': true') ? 'SmartLinks → Documents opened ✓' : 'SmartLinks → Documents skipped'],
    [l => l.includes('Phase 14g: BATCH_LIST document found'),          l => l.includes(': YES') ? 'BATCH_LIST document verified ✓' : 'BATCH_LIST document: not found'],
    [l => l.includes('Phase 14g: Document type BATCH_LIST'),           l => l.includes(': YES') ? 'Document detail: BATCH_LIST type ✓' : 'Document type: not verified'],
    [l => l.includes('Phase 14g: Open button clicked'),                l => l.includes('skipped') ? 'Batch List download: skipped' : 'Batch List download triggered ✓'],
    [l => l.includes('Phase 14g: All popups closed'),                  () => 'All popups closed → main window ✓'],
    [l => l.includes('Phase 14b: Event created: YES'),             () => 'Gate_In event created ✓'],
    [l => l.includes('Phase 14b: Gate_In visible: YES'),           () => 'Gate_In verified in tracking events ✓'],
    [l => l.includes('Phase 14c: Event created: YES'),             () => 'Load_Start event created ✓'],
    [l => l.includes('Phase 14c: Load_Start visible: YES'),        () => 'Load_Start verified in tracking events ✓'],
    [l => l.includes('Phase 14d: Event created: YES'),             () => 'Load_End event created ✓'],
    [l => l.includes('Phase 14d: Load_End visible: YES'),          () => 'Load_End verified in tracking events ✓'],
    [l => l.includes('Phase 14e: PGI POST status=200'),            () => 'PGI posted — HTTP 200 ✓'],
    [l => l.includes('Phase 14f: Event created: YES'),             () => 'Gate_Out event created ✓'],
    [l => l.includes('Phase 14f: Gate_Out visible: YES'),          () => 'Gate_Out verified in tracking events ✓'],
    [l => l.includes('Phase 14: LEL7597_TMS signed out'),          () => 'LEL7597_TMS signed out — all done'],
  ],
};

const STEP_NAMES = {
  'SC-01': ['Load OTM URL', 'Enter username', 'Enter password', 'Click Sign In', 'Verify home page'],
  'SC-02': [
    'Generate test order ID',           // 0
    'Upload TX1 to WMServlet',          // 1
    'Verify TX1 accepted',              // 2
    'Login to OTM',                     // 3
    'Switch to TURKEY_PLANNER role',    // 4
    'Navigate to Order Management',     // 5
    'Verify Movement Type',             // 6
    'Verify Equipment Type',            // 7
    'Verify LDD (TX1)',                 // 8
    'Verify Buy Itinerary = TURKEY_ITINERARY', // 9
    'Verify Fixed Itinerary',           // 10
    'Post TX2 RDD modification',        // 11
    'Verify TX2 accepted',              // 12
    'Verify LDD after TX2',             // 13
    'Post TX3 delivery note',           // 14
    'Verify TX3 accepted',              // 15
    'Verify order in Orders - Unplanned', // 16
    'Verify Delivery Note Number',      // 17
    'Verify LDD after TX3',             // 18
    'Initiate Bulk Plan - Buy',         // 19
    'Verify Bulk Plan COMPLETED',       // 20
    'Capture Shipment ID',              // 21
    'Verify order status = PLANNING_PLANNED', // 22
    'Verify shipment in Shipments-New', // 23
    'Click Approve for Execution',      // 24
    'Approve for Execution done',       // 25
    'Verify shipment in Sent-to-Carrier', // 26
    'Verify Orange indicator',          // 27
    'Sign out LEL7597_TMS',             // 28
    'Login as TR_TST_CARRIER',          // 29
    'Navigate to Shipments - Review',   // 30
    'Select shipment checkbox',         // 31
    'Enter Driver Name',                // 32
    'Enter Trailer Number',             // 33
    'Enter Truck Number',               // 34
    'Enter Driver Phone',               // 35
    'Enter Appointment Time',           // 36
    'Enter Carrier Remarks',            // 37
    'Save Mass Update',                 // 38
    'Verify Driver Name saved',         // 39
    'Verify Trailer Number saved',      // 40
    'Verify Truck Number saved',        // 41
    'Verify Driver Phone saved',        // 42
    'Verify Appointment Time saved',    // 43
    'Verify Carrier Remarks saved',     // 44
    'Switch to KHC_WAREHOUSE role',     // 45
    'Load Shipments page',              // 46
    'Search shipment in KHC_WAREHOUSE', // 47
    'Open Upload Document popup',       // 48
    'Upload Batch List document',       // 49
    'Set document type to BATCH_LIST',  // 50
    'Open SmartLinks → Documents',      // 51
    'Verify BATCH_LIST document',       // 52
    'Verify Document detail (BATCH_LIST)', // 53
    'Trigger Batch List download',      // 54
    'Close all popups → main window',   // 55
    'Add Gate_In tracking event',       // 56
    'Verify Gate_In in tracking events',// 57
    'Add Load_Start tracking event',    // 58
    'Verify Load_Start in tracking events', // 59
    'Add Load_End tracking event',      // 60
    'Verify Load_End in tracking events', // 61
    'Post PGI XML (HTTP 200)',          // 62
    'Add Gate_Out tracking event',      // 63
    'Verify Gate_Out in tracking events', // 64
    'Sign out LEL7597_TMS (end)',       // 65
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
      // Atomically claim the run — if another agent already claimed it, skip
      const claim = await apiCall('POST', `/api/gha/runs/${run.id}/claim`, {});
      if (!claim.claimed) {
        console.log(`[Agent] Run ${run.id} already claimed by another agent — skipping`);
        continue;
      }
      console.log(`\n[Agent] Claimed run ${run.id} | Instance: ${run.instance_id} | Scenarios: ${scenarioIds.join(', ')}`);
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
