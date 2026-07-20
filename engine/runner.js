const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const db = require('../server/db');

const sseClients = new Map();

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients.values()) {
    try { res.write(msg); } catch {}
  }
}

function getSSEClients() {
  return sseClients;
}

const ORACLE_FRAMEWORK_PATH = process.env.ORACLE_FRAMEWORK_PATH || path.join(__dirname, '..', 'oracle');
const TESTDATA_PATH = path.join(__dirname, '..', 'testdata');

function buildEnvironmentConfig(instanceId) {
  const inst = db.prepare('SELECT * FROM instances WHERE id=?').get(instanceId);
  if (!inst) throw new Error(`Instance ${instanceId} not found`);
  return {
    URL: inst.url,
    DBA_USERNAME: inst.dba_username,
    DBA_PASSWORD: inst.dba_password,
    NONDBAUSER: inst.non_dba_username || '',
    NONDBAPASSWORD: inst.non_dba_password || '',
    BROWSER: inst.browser || 'chrome',
    ELEMENT_TIMEOUT: inst.element_timeout || 60000
  };
}

function writeTestDataFiles(instanceId, scenarioIds) {
  const instDataDir = path.join(TESTDATA_PATH, instanceId);
  fs.mkdirSync(instDataDir, { recursive: true });

  for (const scId of scenarioIds) {
    const pairs = db.prepare('SELECT key, value FROM test_data WHERE scenario_id=? AND instance_id=? ORDER BY key').all(scId, instanceId);
    if (pairs.length === 0) continue;
    const content = pairs.map(p => `${p.key}=${p.value}`).join('\n');
    const scenario = db.prepare('SELECT script FROM scenarios WHERE id=?').get(scId);
    if (!scenario) continue;
    const txtFile = scenario.script.replace('.ts', '.txt');
    fs.writeFileSync(path.join(instDataDir, txtFile), content, 'utf8');
  }
}

function startRun(runId, instanceId, scenarioIds) {
  db.prepare(`UPDATE runs SET status='running', started_at=datetime('now') WHERE id=?`).run(runId);
  broadcast('run:started', { runId, instanceId, total: scenarioIds.length });

  setImmediate(async () => {
    let passed = 0;
    let failed = 0;

    for (const scId of scenarioIds) {
      const scenario = db.prepare('SELECT * FROM scenarios WHERE id=?').get(scId);
      if (!scenario) continue;

      db.prepare(`INSERT INTO run_results (run_id,scenario_id,status,started_at) VALUES (?,?,?,datetime('now'))`)
        .run(runId, scId, 'running');

      broadcast('scenario:started', { runId, scenarioId: scId, name: scenario.name });

      const result = await runScenario(runId, instanceId, scenario);

      const endStatus = result.success ? 'pass' : 'fail';
      db.prepare(`UPDATE run_results SET status=?, completed_at=datetime('now'), duration_ms=? WHERE run_id=? AND scenario_id=?`)
        .run(endStatus, result.durationMs, runId, scId);

      if (result.success) passed++; else failed++;

      broadcast('scenario:completed', { runId, scenarioId: scId, status: endStatus, durationMs: result.durationMs });

      const runState = db.prepare('SELECT status FROM runs WHERE id=?').get(runId);
      if (runState && runState.status === 'stopped') break;
    }

    db.prepare(`UPDATE runs SET status='completed', completed_at=datetime('now'), passed=?, failed=?, duration_ms=(strftime('%s','now')-strftime('%s',started_at))*1000 WHERE id=?`)
      .run(passed, failed, runId);

    broadcast('run:completed', { runId, passed, failed, total: scenarioIds.length });

    db.prepare(`INSERT INTO alert_log (message, type, run_id, instance_id) VALUES (?,?,?,?)`)
      .run(`Run ${runId} completed — ${passed}/${scenarioIds.length} passed`, failed > 0 ? 'fail' : 'pass', runId, instanceId);
  });
}

// Step completion patterns per scenario — each entry is [matchFn, actualValueFn]
const STEP_PATTERNS = {
  'SC-01': [
    [l => l.includes('URL -'),               l => `Navigated to: ${l.split('URL - ')[1] || ''}`],
    [l => l.includes('Entering User name'),  () => 'Username entered'],
    [l => l.includes('Entering Password'),   () => 'Password entered'],
    [l => l.includes('Clicking Sign In'),    () => 'Sign In clicked'],
    [l => l.includes('Page title') && l.includes('Transportation'), l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
  ],
  'SC-02': [
    // Phase 1 — TX1 order upload
    [l => l.includes('Generating order ID'),            l => { const m = l.match(/Generating order ID (\S+)/); return m ? `Order ID: ${m[1]}` : 'Order ID generated'; }],
    [l => l.includes('Uploading XML to WMServlet'),     l => { const m = l.match(/for order (\S+)/); return m ? `Uploading TX1: ${m[1]}` : 'Uploading TX1'; }],
    [l => l.includes('WMServlet accepted order'),       () => 'TX1 accepted — HTTP 200 OK'],
    // Phase 2 — OTM login + role switch
    [l => l.includes('Logging in to OTM'),              () => 'Logging in as LEL7597_TMS'],
    [l => l.includes('Role switched to TURKEY_PLANNER'),() => 'Switched to TURKEY_PLANNER role'],
    // Phase 3 — Order verification (Orders - New)
    [l => l.includes('Navigating to Order Management'), () => 'Navigating to Orders - New'],
    [l => l.includes('Movement Type verified'),         l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Equipment Type verified'),        l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('LDD verified:'),                  l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Buy Itinerary verified'),         l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Fixed Itinerary verified'),       l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    // Phase 4 — TX2 modification
    [l => l.includes('Posting TX2 modification'),       l => { const m = l.match(/for TMS\.(\S+) with RDD (\S+)/); return m ? `TX2: order ${m[1]}, RDD ${m[2]}` : 'Posting TX2'; }],
    [l => l.includes('TX2 accepted'),                   () => 'TX2 accepted — HTTP 200 OK'],
    [l => l.includes('LDD after TX2 verified'),         l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    // Phase 5 — TX3 delivery note
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
    // Phase 12 — Sign out LEL7597_TMS
    [l => l.includes('Sign out verified'),              () => 'LEL7597_TMS signed out'],
    // Phase 13 — Carrier Portal login
    [l => l.includes('Carrier logged in'),              () => 'TR_TST_CARRIER logged in'],
    [l => l.includes('Shipments - Review finder loaded'),() => 'Navigated to Shipments - Review'],
    [l => l.includes('Phase 13 Step 113: Checkbox clicked'), l => { const m = l.match(/clicked: (TMS\.\S+)/); return m ? `Shipment selected: ${m[1]}` : 'Shipment checkbox selected'; }],
    // Phase 13 — Mass Update
    [l => l.includes('Phase 13 Step 116: Driver Name'), l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Phase 13 Step 117: Trailer'),     l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Phase 13 Step 118: Truck'),       l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Phase 13 Step 119: Driver Phone'),l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Phase 13 Step 120: Appointment'),l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Phase 13 Step 121: Carrier Remarks'),l => l.replace(/\[INFO[^\]]*\]\s*/, '')],
    [l => l.includes('Phase 13 Saving complete: true'), () => 'Mass Update saved ✓'],
    // Phase 13 — Verify saved values
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

function markStepPass(runId, scenarioId, stepIndex, actual, stepStartTime) {
  const dur = Date.now() - stepStartTime;
  db.prepare(`UPDATE run_steps SET status='pass', actual=?, duration_ms=? WHERE run_id=? AND scenario_id=? AND step_index=?`)
    .run(actual || null, dur, runId, scenarioId, stepIndex);
  broadcast('step', { runId, scenarioId, stepIndex, status: 'pass', actual });
}

async function runScenario(runId, instanceId, scenario) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const steps = getScenarioSteps(scenario.id);

    const environmentConfig = (() => {
      try { return buildEnvironmentConfig(instanceId); } catch { return null; }
    })();

    if (!environmentConfig || !environmentConfig.URL) {
      steps.forEach((step, i) => {
        db.prepare(`INSERT INTO run_steps (run_id,scenario_id,step_index,step_name,status,error,duration_ms) VALUES (?,?,?,?,?,?,?)`)
          .run(runId, scenario.id, i, step, 'skip', 'Instance URL not configured', 0);
        broadcast('step', { runId, scenarioId: scenario.id, stepIndex: i, stepName: step, status: 'skip' });
      });
      return resolve({ success: false, durationMs: Date.now() - startTime });
    }

    const scriptPath = path.join(ORACLE_FRAMEWORK_PATH, 'Bin', 'Tests', 'SanityBatch', scenario.script.replace('.ts', '.js'));

    if (!fs.existsSync(scriptPath)) {
      db.prepare(`INSERT INTO run_steps (run_id,scenario_id,step_index,step_name,status,error,duration_ms) VALUES (?,?,?,?,?,?,?)`)
        .run(runId, scenario.id, 0, 'Load test script', 'fail', `Script not found: ${scenario.script}`, 200);
      broadcast('step', { runId, scenarioId: scenario.id, stepIndex: 0, stepName: 'Load test script', status: 'fail', error: `Script not found: ${scenario.script}` });
      return resolve({ success: false, durationMs: Date.now() - startTime });
    }

    const stepDefs = db.prepare('SELECT step_index, expected FROM scenario_steps WHERE scenario_id=? ORDER BY step_index').all(scenario.id);
    const expectedMap = {};
    for (const d of stepDefs) expectedMap[d.step_index] = d.expected;

    // Insert step 0 as 'running', rest as 'pending' — we'll flip them one by one
    steps.forEach((step, i) => {
      db.prepare(`INSERT INTO run_steps (run_id,scenario_id,step_index,step_name,status,expected,duration_ms) VALUES (?,?,?,?,?,?,?)`)
        .run(runId, scenario.id, i, step, i === 0 ? 'running' : 'pending', expectedMap[i] || '', 0);
    });

    const envConfig = path.join(ORACLE_FRAMEWORK_PATH, 'EnvironmentConfig.json');
    fs.writeFileSync(envConfig, JSON.stringify(environmentConfig, null, 2), 'utf8');

    const screenshotsDir = path.join(__dirname, '..', 'screenshots', runId, scenario.id);
    fs.mkdirSync(screenshotsDir, { recursive: true });

    // --- Log tailing setup ---
    const logFile = path.join(ORACLE_FRAMEWORK_PATH, 'Results', 'SanityBatch', 'Logs', scenario.script.replace('.ts', '.log'));
    const patterns = STEP_PATTERNS[scenario.id] || [];
    let logOffset = 0;
    let nextStep = 0;           // next step index waiting to be matched
    const stepStartTimes = steps.map(() => 0);
    stepStartTimes[0] = Date.now();

    // Get initial log file size so we only read NEW lines written during this run
    try {
      if (fs.existsSync(logFile)) logOffset = fs.statSync(logFile).size;
    } catch {}

    function activateStep(idx) {
      if (idx >= steps.length) return;
      db.prepare(`UPDATE run_steps SET status='running' WHERE run_id=? AND scenario_id=? AND step_index=?`)
        .run(runId, scenario.id, idx);
      broadcast('step', { runId, scenarioId: scenario.id, stepIndex: idx, status: 'running' });
      stepStartTimes[idx] = Date.now();
    }

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

        const newLines = buf.toString('utf8').split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of newLines) {
          if (nextStep >= patterns.length) break;
          const [matchFn, actualFn] = patterns[nextStep];
          if (matchFn(line)) {
            const actual = actualFn(line);
            markStepPass(runId, scenario.id, nextStep, actual, stepStartTimes[nextStep]);
            nextStep++;
            if (nextStep < steps.length) activateStep(nextStep);
          }
        }
      } catch {}
    }

    const pollInterval = setInterval(pollLog, 500);
    // --- End log tailing setup ---

    const mochaBin = path.join(__dirname, '..', 'node_modules', '.bin', 'mocha');
    const proc = spawn(mochaBin, ['--no-timeout', '--reporter', 'spec', scriptPath], {
      cwd: ORACLE_FRAMEWORK_PATH,
      shell: true,
      windowsHide: false,
      env: {
        ...process.env,
        ...environmentConfig,
        FORCE_COLOR: '0',
        SCREENSHOTS_DIR: screenshotsDir,
        PATH: path.join(__dirname, '..', 'node_modules', '.bin') + ';' + ORACLE_FRAMEWORK_PATH + ';' + process.env.PATH
      }
    });

    let outputBuf = '';
    proc.stdout.on('data', d => { outputBuf += d.toString(); });
    proc.stderr.on('data', d => { outputBuf += d.toString(); });

    proc.on('close', (code) => {
      clearInterval(pollInterval);
      pollLog(); // final drain of any remaining log lines

      const durationMs = Date.now() - startTime;
      const success = code === 0;

      if (success) {
        // Mark any remaining unmatched steps as pass (log pattern gaps)
        steps.forEach((_, i) => {
          const row = db.prepare(`SELECT status FROM run_steps WHERE run_id=? AND scenario_id=? AND step_index=?`).get(runId, scenario.id, i);
          if (row && (row.status === 'running' || row.status === 'pending')) {
            markStepPass(runId, scenario.id, i, null, stepStartTimes[i] || startTime);
          }
        });
      } else {
        const errLine = outputBuf.split('\n').find(l => /AssertionError|Error:|TimeoutError|failed/i.test(l)) || 'Test failed';
        const errMsg = errLine.trim().slice(0, 300);
        // Everything passed up to nextStep-1; nextStep is the failed one; rest are skipped
        steps.forEach((_, i) => {
          const row = db.prepare(`SELECT status FROM run_steps WHERE run_id=? AND scenario_id=? AND step_index=?`).get(runId, scenario.id, i);
          if (!row || row.status === 'pass') return;
          const status = (row.status === 'running') ? 'fail' : 'skip';
          const err = status === 'fail' ? errMsg : null;
          db.prepare(`UPDATE run_steps SET status=?, error=?, duration_ms=? WHERE run_id=? AND scenario_id=? AND step_index=?`)
            .run(status, err, status === 'fail' ? Date.now() - (stepStartTimes[i] || startTime) : 0, runId, scenario.id, i);
          broadcast('step', { runId, scenarioId: scenario.id, stepIndex: i, status, error: err });
        });
      }

      resolve({ success, durationMs });
    });

    proc.on('error', (err) => {
      clearInterval(pollInterval);
      console.error('[Runner] Spawn error:', err.message);
      resolve({ success: false, durationMs: Date.now() - startTime });
    });
  });
}

function parseOracleLog(scenario) {
  // Log file is at Results/SanityBatch/Logs/<scriptname>.log
  const logFile = path.join(
    ORACLE_FRAMEWORK_PATH, 'Results', 'SanityBatch', 'Logs',
    scenario.script.replace('.ts', '.log')
  );
  if (!fs.existsSync(logFile)) return {};

  const lines = fs.readFileSync(logFile, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
  // Read only the LAST run's lines (after the last "Running tests on" marker)
  let startIdx = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('Running tests on')) { startIdx = i; break; }
  }
  const runLines = lines.slice(startIdx).filter(l => l.startsWith('[INFO'));

  // Map log lines to step indices based on known content patterns for each scenario
  const stepActualPatterns = {
    'SC-01': [
      l => l.includes('URL -') ? `Navigated to: ${l.split('URL - ')[1]}` : null,
      l => l.includes('Entering User name') ? l.replace(/\[INFO[^\]]*\]\s*/, '') : null,
      l => l.includes('Entering Password') ? 'Password entered (masked)' : null,
      l => l.includes('Clicking Sign In') ? 'Sign In button clicked' : null,
      l => l.includes('Page title') && l.includes('Transportation') ? l.replace(/\[INFO[^\]]*\]\s*/, '') : null,
    ]
  };

  const patterns = stepActualPatterns[scenario.id];
  if (!patterns) return {};

  const actualMap = {};
  for (const line of runLines) {
    patterns.forEach((fn, idx) => {
      if (actualMap[idx]) return; // already matched
      const result = fn(line);
      if (result) actualMap[idx] = result;
    });
  }
  return actualMap;
}

function getScenarioSteps(scenarioId) {
  const stepMap = {
    'SC-01': ['Load OTM URL', 'Enter username', 'Enter password', 'Click Sign In', 'Verify home page'],
    'SC-02': [
      // Phase 1 — TX1
      'Generate test order ID',
      'Upload TX1 XML to WMServlet',
      'Verify TX1 accepted (HTTP 200)',
      // Phase 2 — Login + role
      'Login to OTM as LEL7597_TMS',
      'Switch to TURKEY_PLANNER role',
      // Phase 3 — Order verification
      'Navigate to Orders - New',
      'Verify Movement Type = DOMESTIC',
      'Verify Equipment Type = DRY',
      'Verify LDD (TX1)',
      'Verify Buy Itinerary = TURKEY_ITINERARY',
      'Verify Fixed Itinerary = Buy Itinerary Profile',
      // Phase 4 — TX2
      'Post TX2 RDD modification',
      'Verify TX2 accepted (HTTP 200)',
      'Verify LDD after TX2',
      // Phase 5 — TX3
      'Post TX3 delivery note',
      'Verify TX3 accepted (HTTP 200)',
      // Phase 6 — Orders Unplanned (appears before DN verification in log)
      'Verify order in Orders - Unplanned',
      'Verify Delivery Note Number',
      'Verify LDD after TX3',
      // Phase 7-8 — Bulk Plan
      'Initiate Bulk Plan - Buy',
      'Verify Bulk Plan COMPLETED',
      'Capture Shipment ID',
      // Phase 9 — Planned status
      'Verify order status = PLANNING_PLANNED',
      // Phase 10 — Approve for Execution
      'Verify shipment in Shipments - New',
      'Click Approve for Execution',
      'Verify Approve for Execution done',
      // Phase 11 — Sent to Carrier
      'Verify shipment in Sent-to-Carrier',
      'Verify Orange indicator',
      // Phase 12 — Sign out
      'Sign out LEL7597_TMS',
      // Phase 13 — Carrier Portal login
      'Login as TR_TST_CARRIER',
      'Navigate to Shipments - Review',
      'Select shipment checkbox',
      // Phase 13 — Mass Update
      'Enter Driver Name',
      'Enter Trailer Number',
      'Enter Truck Number',
      'Enter Driver Phone',
      'Enter Appointment Time',
      'Enter Carrier Remarks',
      'Save Mass Update',
      // Phase 13 — Verify
      'Verify Driver Name saved',
      'Verify Trailer Number saved',
      'Verify Truck Number saved',
      'Verify Driver Phone saved',
      'Verify Appointment Time saved',
      'Verify Carrier Remarks saved',
      // Phase 14 — KHC_WAREHOUSE
      'Switch to KHC_WAREHOUSE role',
      'Load Shipments page',
      'Search shipment in KHC_WAREHOUSE',
      'Open Upload Document popup',
      'Upload Batch List document',
      'Set document type to BATCH_LIST',
      'Add Gate_In tracking event',
      'Verify Gate_In in tracking events',
      'Add Load_Start tracking event',
      'Verify Load_Start in tracking events',
      'Add Load_End tracking event',
      'Verify Load_End in tracking events',
      'Post PGI XML (HTTP 200)',
      'Add Gate_Out tracking event',
      'Verify Gate_Out in tracking events',
      'Sign out LEL7597_TMS',
    ],
    'SC-03': ['Login to OTM', 'Search multiple orders', 'Select all suppliers', 'Consolidate shipment', 'Verify consolidation'],
    'SC-04': ['Login to OTM', 'Navigate to Rate Inquiry', 'Enter origin & destination', 'Run rate lookup', 'Verify carrier rates'],
    'SC-05': ['Login to OTM', 'Navigate to shipment', 'Open document panel', 'Upload document', 'Verify attachment'],
    'SC-06': ['Login to OTM', 'Navigate to Order Release', 'Search sales order', 'Plan outbound shipment', 'Tender to carrier'],
    'SC-07': ['Login to OTM', 'Verify auto tender triggered', 'Check carrier portal', 'Accept tender', 'Verify execution'],
    'SC-08': ['Login to OTM', 'Create multi stop shipment', 'Add stop 1', 'Add stop 2', 'Plan route', 'Execute'],
    'SC-09': ['Login to OTM', 'Navigate to export shipment', 'Generate customs docs', 'Verify documents'],
    'SC-10': ['Login to OTM', 'Run rate inquiry', 'Compare carrier rates', 'Select cheapest carrier'],
    'SC-11': ['Login to OTM', 'Navigate to invoicing', 'Generate invoice', 'Approve invoice', 'Post to finance'],
    'SC-12': ['Login to OTM', 'Search shipment', 'Update milestone', 'Verify status change'],
    'SC-13': ['Login to OTM', 'Trigger ERP integration', 'Verify inbound order', 'Check data mapping'],
    'SC-14': ['Login to OTM', 'Execute outbound status', 'Verify ERP update', 'Confirm sync'],
    'SC-15': ['Login to OTM', 'Navigate to reporting', 'Run carrier report', 'Verify report data'],
  };
  return stepMap[scenarioId] || ['Login to OTM', 'Execute test', 'Verify result'];
}

module.exports = { startRun, getSSEClients };
