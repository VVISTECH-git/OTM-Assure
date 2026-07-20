const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'otm-assure.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode=WAL');
db.exec('PRAGMA foreign_keys=ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS instances (
    id          TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    url         TEXT NOT NULL DEFAULT '',
    dba_username TEXT NOT NULL DEFAULT '',
    dba_password TEXT NOT NULL DEFAULT '',
    non_dba_username TEXT DEFAULT '',
    non_dba_password TEXT DEFAULT '',
    browser     TEXT NOT NULL DEFAULT 'chrome',
    element_timeout INTEGER NOT NULL DEFAULT 60000,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS scenarios (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    description TEXT DEFAULT '',
    script      TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'active',
    instances   TEXT NOT NULL DEFAULT '["DEV","TST","UAT","PRD"]',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS test_data (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    key         TEXT NOT NULL,
    value       TEXT NOT NULL DEFAULT '',
    UNIQUE(scenario_id, instance_id, key)
  );

  CREATE TABLE IF NOT EXISTS runs (
    id          TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL,
    trigger     TEXT NOT NULL DEFAULT 'Manual',
    triggered_by TEXT NOT NULL DEFAULT 'Admin',
    scenario_ids TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    started_at  TEXT,
    completed_at TEXT,
    duration_ms INTEGER,
    total       INTEGER DEFAULT 0,
    passed      INTEGER DEFAULT 0,
    failed      INTEGER DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS run_results (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    started_at  TEXT,
    completed_at TEXT,
    duration_ms INTEGER,
    FOREIGN KEY(run_id) REFERENCES runs(id)
  );

  CREATE TABLE IF NOT EXISTS scenario_steps (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_id TEXT NOT NULL,
    step_index  INTEGER NOT NULL,
    step_name   TEXT NOT NULL,
    expected    TEXT NOT NULL DEFAULT '',
    UNIQUE(scenario_id, step_index)
  );

  CREATE TABLE IF NOT EXISTS run_steps (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id      TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    step_index  INTEGER NOT NULL,
    step_name   TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    expected    TEXT DEFAULT NULL,
    actual      TEXT DEFAULT NULL,
    error       TEXT DEFAULT NULL,
    screenshot  TEXT DEFAULT NULL,
    duration_ms INTEGER,
    logged_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(run_id) REFERENCES runs(id)
  );

  CREATE TABLE IF NOT EXISTS defects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ref         TEXT NOT NULL UNIQUE,
    title       TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority    TEXT NOT NULL DEFAULT 'Medium',
    status      TEXT NOT NULL DEFAULT 'Open',
    instance_id TEXT NOT NULL,
    scenario_id TEXT NOT NULL,
    run_id      TEXT,
    step_name   TEXT,
    screenshot  TEXT,
    assignee    TEXT DEFAULT 'Unassigned',
    notes       TEXT DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    scenario_ids TEXT NOT NULL DEFAULT '["ALL"]',
    frequency   TEXT NOT NULL DEFAULT 'daily',
    cron_expr   TEXT NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1,
    last_run_at TEXT,
    next_run_at TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger     TEXT NOT NULL,
    instance_id TEXT NOT NULL DEFAULT 'ALL',
    channels    TEXT NOT NULL DEFAULT '["Email"]',
    enabled     INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS alert_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    message     TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'info',
    run_id      TEXT,
    instance_id TEXT,
    read        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'Viewer',
    instances   TEXT NOT NULL DEFAULT '[]',
    active      INTEGER NOT NULL DEFAULT 1,
    last_login  TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migrations — add columns that may not exist in older DB
function migrate() {
  const cols = db.prepare("PRAGMA table_info(run_steps)").all().map(c => c.name);
  if (!cols.includes('expected')) db.exec("ALTER TABLE run_steps ADD COLUMN expected TEXT DEFAULT NULL");
  if (!cols.includes('actual'))   db.exec("ALTER TABLE run_steps ADD COLUMN actual TEXT DEFAULT NULL");

  // Backfill duration_ms for completed runs where started_at was never set
  db.exec(`UPDATE runs SET duration_ms=(strftime('%s',completed_at)-strftime('%s',created_at))*1000 WHERE status='completed' AND duration_ms IS NULL AND completed_at IS NOT NULL AND created_at IS NOT NULL`);

  // Update SC-02 to real scenario if it was seeded with placeholder values
  db.prepare(`UPDATE scenarios SET name=?, script=? WHERE id='SC-02' AND script='Test_02_POImport.ts'`)
    .run('TR Order SAP Integration', 'Test_02_TROrderIntegration.ts');
}
migrate();

function seed() {
  const scenariosFile = path.join(__dirname, '..', 'scenarios', 'scenarios.json');
  const instancesFile = path.join(__dirname, '..', 'instances', 'instances.json');

  // Always sync scenarios from file — remove stale ones, upsert current ones
  const scenarios = JSON.parse(fs.readFileSync(scenariosFile, 'utf8'));
  const validIds = scenarios.map(s => s.id);
  db.prepare(`DELETE FROM scenarios WHERE id NOT IN (${validIds.map(() => '?').join(',')})`)
    .run(...validIds);
  const upsert = db.prepare(`INSERT OR REPLACE INTO scenarios (id,name,category,script,status,instances) VALUES (?,?,?,?,?,?)`);
  for (const s of scenarios) {
    upsert.run(s.id, s.name, s.category, s.script, s.status, JSON.stringify(s.instances));
  }
  console.log(`[DB] Synced ${scenarios.length} scenarios`);

  const existingInstances = db.prepare('SELECT COUNT(*) as c FROM instances').get();
  if (existingInstances.c === 0) {
    const instances = JSON.parse(fs.readFileSync(instancesFile, 'utf8'));
    const ins = db.prepare(`INSERT OR IGNORE INTO instances (id,label,url,dba_username,dba_password,browser,element_timeout,active) VALUES (?,?,?,?,?,?,?,?)`);
    for (const i of instances) {
      ins.run(i.id, i.label, i.url, i.dba_username, i.dba_password, i.browser, i.element_timeout, i.active ? 1 : 0);
    }
    console.log(`[DB] Seeded ${instances.length} instances`);
  }

  const existingUsers = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (existingUsers.c === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (name,email,password,role,instances) VALUES (?,?,?,?,?)`).run(
      'Admin', 'admin@otm-assure.com', hash, 'Admin', '["DEV","TST","UAT","PRD"]'
    );
    console.log('[DB] Seeded default admin user (admin@otm-assure.com / admin123)');
  }

  const existingSteps = db.prepare('SELECT COUNT(*) as c FROM scenario_steps').get();
  if (existingSteps.c === 0) {
    const stepDefs = [
      ['SC-01', 0, 'Load OTM URL',              'OTM Sign In page loads successfully'],
      ['SC-01', 1, 'Enter username',             'Username field accepts input without error'],
      ['SC-01', 2, 'Enter password',             'Password field accepts input without error'],
      ['SC-01', 3, 'Click Sign In',              'Sign In button is clicked and authentication is initiated'],
      ['SC-01', 4, 'Verify home page',           'Transportation Management home page is displayed'],
      ['SC-02',  0, 'Generate test order ID',              'Order ID generated in format TR_YYYYMMDD_NNN'],
      ['SC-02',  1, 'Upload TX1 to WMServlet',             'TX1 XML POSTed to WMServlet — HTTP 200, no Error element'],
      ['SC-02',  2, 'Verify TX1 accepted',                 'WMServlet accepted TX1 order creation'],
      ['SC-02',  3, 'Login to OTM',                        'OTM home page loaded as LEL7597_TMS'],
      ['SC-02',  4, 'Switch to TURKEY_PLANNER role',       'OTM reloaded under TURKEY_PLANNER role'],
      ['SC-02',  5, 'Navigate to Order Management',        'Order Management > Orders - New finder displayed'],
      ['SC-02',  6, 'Search for TX1 order',                'Order TR_YYYYMMDD_NNN found in Orders - New'],
      ['SC-02',  7, 'Verify Movement Type',                'MOVEMENT_TYPE refnum = DOMESTIC or EXPORT'],
      ['SC-02',  8, 'Verify Equipment Type',               'EQUIPMENT_TYPE refnum = DRY or REEFER'],
      ['SC-02',  9, 'Verify Buy Itinerary = TURKEY_ITINERARY', 'Buy Itinerary Profile = TMS.TURKEY_ITINERARY on Constraints tab'],
      ['SC-02', 10, 'Verify Fixed Itinerary',              'Fixed Itinerary logged (empty for domestic orders)'],
      ['SC-02', 11, 'Upload TX2 modification',             'TX2 XML (RDD +4) POSTed to WMServlet — HTTP 200'],
      ['SC-02', 12, 'Verify TX2 LDD updated',              'Late Delivery Date updated to TX2 RDD in order detail'],
      ['SC-02', 13, 'Upload TX3 delivery note',            'TX3 XML (DN 0087325725) POSTed to WMServlet — HTTP 200'],
      ['SC-02', 14, 'Verify Delivery Note Number',         'DELIVERY_NOTE_NUMBER refnum = 0087325725 in order detail'],
      ['SC-02', 15, 'Verify Bulk Plan COMPLETED',          'Bulk Plan - Buy job status = COMPLETED'],
      ['SC-02', 16, 'Verify Orders Failed to Plan = 0',   'Orders Failed to Plan count = 0 in Bulk Plan results'],
      ['SC-02', 17, 'Verify order in Orders-Planned',      'Order appears in Orders - Planned with PLANNING_PLANNED status'],
      ['SC-02', 18, 'Verify shipment in Shipments-New',    'Buy shipment appears in Shipment Management > Shipments - New'],
      ['SC-02', 19, 'Click Approve for Execution',         'Approve for Execution action triggered from Actions menu'],
      ['SC-02', 20, 'Approve for Execution done',          'Shipment tender results popup closed — execution approved'],
      ['SC-02', 21, 'Verify shipment in Sent-to-Carrier',  'Shipment appears in Shipments - Sent to Carrier view'],
      ['SC-02', 22, 'Verify Orange indicator',             'Orange indicator confirms shipment sent to carrier'],
      ['SC-02', 23, 'Sign out LEL7597_TMS',                'LEL7597_TMS signed out — returned to Oracle Cloud login'],
      ['SC-02', 24, 'Login as TR_TST_CARRIER',             'Carrier portal home loaded as TR_TST_CARRIER'],
      ['SC-02', 25, 'Navigate to Shipments - Review',      'Shipments - Review finder displayed in Carrier Portal'],
      ['SC-02', 26, 'Select shipment checkbox',            'Target shipment checkbox selected in results grid'],
      ['SC-02', 27, 'Enter Driver Name',                   'Driver Name field populated: JOHN DOE'],
      ['SC-02', 28, 'Enter Trailer Number',                'Trailer Number field populated: TRL 001'],
      ['SC-02', 29, 'Enter Truck Number',                  'Truck Number field populated: TRC 001'],
      ['SC-02', 30, 'Enter Driver Phone',                  'Driver Phone field populated: 0123456789'],
      ['SC-02', 31, 'Enter Appointment Time',              'Appointment Time field populated: 11:30'],
      ['SC-02', 32, 'Enter Carrier Remarks',               'Carrier Remarks populated: I WILL COME ON TIME'],
      ['SC-02', 33, 'Save Mass Update',                    'Mass Update saved — green checkmark confirmed'],
      ['SC-02', 34, 'Verify Driver Name saved',            'Driver Name "JOHN DOE" visible in results grid'],
      ['SC-02', 35, 'Verify Trailer Number saved',         'Trailer Number "TRL 001" visible in results grid'],
      ['SC-02', 36, 'Verify Truck Number saved',           'Truck Number "TRC 001" visible in results grid'],
      ['SC-02', 37, 'Verify Driver Phone saved',           'Driver Phone "0123456789" visible in results grid'],
      ['SC-02', 38, 'Verify Appointment Time saved',       'Appointment Time "11:30" visible in results grid'],
      ['SC-02', 39, 'Verify Carrier Remarks saved',        'Carrier Remarks visible in results grid'],
      ['SC-02', 40, 'Switch to KHC_WAREHOUSE role',        'OTM reloaded under KHC_WAREHOUSE role'],
      ['SC-02', 41, 'Load Shipments page',                 'Shipments page loaded — mainIFrame ready'],
      ['SC-02', 42, 'Search shipment in KHC_WAREHOUSE',    'Shipment found via Refine Query in KHC_WAREHOUSE'],
      ['SC-02', 43, 'Open Upload Document popup',          'Upload Document popup opened from Actions menu'],
      ['SC-02', 44, 'Upload Batch List document',          'Batch List.docx uploaded successfully'],
      ['SC-02', 45, 'Set document type to BATCH_LIST',     'Document type updated to BATCH_LIST'],
      ['SC-02', 46, 'Add Gate_In tracking event',          'Gate_In (TMS.GI) event created successfully'],
      ['SC-02', 47, 'Verify Gate_In in tracking events',   'Gate_In visible in View Tracking Events popup'],
      ['SC-02', 48, 'Add Load_Start tracking event',       'Load_Start (TMS.LS) event created successfully'],
      ['SC-02', 49, 'Verify Load_Start in tracking events','Load_Start visible in View Tracking Events popup'],
      ['SC-02', 50, 'Add Load_End tracking event',         'Load_End (TMS.LE) event created successfully'],
      ['SC-02', 51, 'Verify Load_End in tracking events',  'Load_End visible in View Tracking Events popup'],
      ['SC-02', 52, 'Post PGI XML (HTTP 200)',             'PGI XML posted to WMServlet — HTTP 200 TransmissionAck'],
      ['SC-02', 53, 'Add Gate_Out tracking event',         'Gate_Out (TMS.GO) event created successfully'],
      ['SC-02', 54, 'Verify Gate_Out in tracking events',  'Gate_Out visible in View Tracking Events popup'],
      ['SC-02', 55, 'Sign out LEL7597_TMS',                'LEL7597_TMS signed out — end of SC-02'],
    ];
    const ins = db.prepare(`INSERT OR IGNORE INTO scenario_steps (scenario_id,step_index,step_name,expected) VALUES (?,?,?,?)`);
    for (const s of stepDefs) ins.run(...s);
    console.log('[DB] Seeded scenario step definitions');
  }

  // Migration: upsert all 61 SC-02 steps to match STEP_PATTERNS/STEP_NAMES in local-agent.js
  const sc02AllSteps = [
    [0,  'Generate test order ID',              'Order ID generated in format TR_YYYYMMDD_NNN'],
    [1,  'Upload TX1 to WMServlet',             'TX1 XML POSTed to WMServlet — HTTP 200, no Error element'],
    [2,  'Verify TX1 accepted',                 'WMServlet accepted TX1 order creation'],
    [3,  'Login to OTM',                        'OTM home page loaded as LEL7597_TMS'],
    [4,  'Switch to TURKEY_PLANNER role',       'OTM reloaded under TURKEY_PLANNER role'],
    [5,  'Navigate to Order Management',        'Order Management finder displayed'],
    [6,  'Verify Movement Type',                'MOVEMENT_TYPE refnum verified in order detail'],
    [7,  'Verify Equipment Type',               'EQUIPMENT_TYPE refnum verified in order detail'],
    [8,  'Verify LDD (TX1)',                    'Late Delivery Date set correctly from TX1'],
    [9,  'Verify Buy Itinerary = TURKEY_ITINERARY', 'Buy Itinerary Profile = TMS.TURKEY_ITINERARY on Constraints tab'],
    [10, 'Verify Fixed Itinerary',              'Fixed Itinerary verified in order detail'],
    [11, 'Post TX2 RDD modification',           'TX2 XML (RDD +4) POSTed to WMServlet — HTTP 200'],
    [12, 'Verify TX2 accepted',                 'TX2 accepted — HTTP 200 OK'],
    [13, 'Verify LDD after TX2',                'Late Delivery Date updated to TX2 RDD'],
    [14, 'Post TX3 delivery note',              'TX3 XML (DN 0087325725) POSTed to WMServlet — HTTP 200'],
    [15, 'Verify TX3 accepted',                 'TX3 accepted — HTTP 200 OK'],
    [16, 'Verify order in Orders - Unplanned',  'Order found in Orders - Unplanned bucket'],
    [17, 'Verify Delivery Note Number',         'DELIVERY_NOTE_NUMBER refnum = 0087325725 in order detail'],
    [18, 'Verify LDD after TX3',                'LDD reflects TX3 delivery date'],
    [19, 'Initiate Bulk Plan - Buy',            'Bulk Plan - Buy job triggered from Actions menu'],
    [20, 'Verify Bulk Plan COMPLETED',          'Bulk Plan - Buy job status = COMPLETED'],
    [21, 'Capture Shipment ID',                 'Shipment ID captured from Bulk Plan results (TMS.XXXXXXXXX)'],
    [22, 'Verify order status = PLANNING_PLANNED', 'Order status = PLANNING_PLANNED in Orders - Planned'],
    [23, 'Verify shipment in Shipments-New',    'Buy shipment appears in Shipment Management > Shipments - New'],
    [24, 'Click Approve for Execution',         'Approve for Execution action triggered from Actions menu'],
    [25, 'Approve for Execution done',          'Shipment tender results popup closed — execution approved'],
    [26, 'Verify shipment in Sent-to-Carrier',  'Shipment appears in Shipments - Sent to Carrier view'],
    [27, 'Verify Orange indicator',             'Orange indicator confirms shipment sent to carrier'],
    [28, 'Sign out LEL7597_TMS',                'LEL7597_TMS signed out — returned to Oracle Cloud login'],
    [29, 'Login as TR_TST_CARRIER',             'Carrier portal home loaded as TR_TST_CARRIER'],
    [30, 'Navigate to Shipments - Review',      'Shipments - Review finder displayed in Carrier Portal'],
    [31, 'Select shipment checkbox',            'Target shipment checkbox selected in results grid'],
    [32, 'Enter Driver Name',                   'Driver Name field populated: JOHN DOE'],
    [33, 'Enter Trailer Number',                'Trailer Number field populated: TRL 001'],
    [34, 'Enter Truck Number',                  'Truck Number field populated: TRC 001'],
    [35, 'Enter Driver Phone',                  'Driver Phone field populated: 0123456789'],
    [36, 'Enter Appointment Time',              'Appointment Time field populated: 11:30'],
    [37, 'Enter Carrier Remarks',               'Carrier Remarks populated: I WILL COME ON TIME'],
    [38, 'Save Mass Update',                    'Mass Update saved — green checkmark confirmed'],
    [39, 'Verify Driver Name saved',            'Driver Name "JOHN DOE" visible in results grid'],
    [40, 'Verify Trailer Number saved',         'Trailer Number "TRL 001" visible in results grid'],
    [41, 'Verify Truck Number saved',           'Truck Number "TRC 001" visible in results grid'],
    [42, 'Verify Driver Phone saved',           'Driver Phone "0123456789" visible in results grid'],
    [43, 'Verify Appointment Time saved',       'Appointment Time "11:30" visible in results grid'],
    [44, 'Verify Carrier Remarks saved',        'Carrier Remarks visible in results grid'],
    [45, 'Switch to KHC_WAREHOUSE role',        'OTM reloaded under KHC_WAREHOUSE role'],
    [46, 'Load Shipments page',                 'Shipments page loaded — mainIFrame ready'],
    [47, 'Search shipment in KHC_WAREHOUSE',    'Shipment found via Refine Query in KHC_WAREHOUSE'],
    [48, 'Open Upload Document popup',          'Upload Document popup opened from Actions menu'],
    [49, 'Upload Batch List document',          'Batch List.docx uploaded successfully'],
    [50, 'Set document type to BATCH_LIST',     'Document type updated to BATCH_LIST'],
    [51, 'Open SmartLinks → Documents',         'SmartLinks context menu opened → Documents clicked'],
    [52, 'Verify BATCH_LIST document',          'Documents popup: Total Found ≥ 1, BATCH_LIST type present'],
    [53, 'Verify Document detail (BATCH_LIST)', 'View popup: Type=BATCH_LIST, File Name=Batch List.docx'],
    [54, 'Trigger Batch List download',         'Open button clicked — Batch List.docx downloading'],
    [55, 'Close all popups → main window',      'All popup windows closed, driver on main window'],
    [56, 'Add Gate_In tracking event',          'Gate_In (TMS.GI) event created successfully'],
    [57, 'Verify Gate_In in tracking events',   'Gate_In visible in View Tracking Events popup'],
    [58, 'Add Load_Start tracking event',       'Load_Start (TMS.LS) event created successfully'],
    [59, 'Verify Load_Start in tracking events','Load_Start visible in View Tracking Events popup'],
    [60, 'Add Load_End tracking event',         'Load_End (TMS.LE) event created successfully'],
    [61, 'Verify Load_End in tracking events',  'Load_End visible in View Tracking Events popup'],
    [62, 'Post PGI XML (HTTP 200)',             'PGI XML posted to WMServlet — HTTP 200 TransmissionAck'],
    [63, 'Add Gate_Out tracking event',         'Gate_Out (TMS.GO) event created successfully'],
    [64, 'Verify Gate_Out in tracking events',  'Gate_Out visible in View Tracking Events popup'],
    [65, 'Sign out LEL7597_TMS (end)',          'LEL7597_TMS signed out — end of SC-02'],
  ];
  const upsertStep = db.prepare(`INSERT OR REPLACE INTO scenario_steps (scenario_id,step_index,step_name,expected) VALUES ('SC-02',?,?,?)`);
  for (const [idx, name, exp] of sc02AllSteps) upsertStep.run(idx, name, exp);
  console.log('[DB] SC-02 step definitions synced (66 steps, indices 0-65)');

  const existingNotifications = db.prepare('SELECT COUNT(*) as c FROM notifications').get();
  if (existingNotifications.c === 0) {
    const defaultRules = [
      ['Any scenario fails',          'ALL', '["Email","Slack"]', 1],
      ['Pass rate drops below 70%',   'UAT', '["Email","Slack","SMS"]', 1],
      ['Run completes',               'PRD', '["Email"]', 1],
      ['Scheduled run starts',        'ALL', '["Slack"]', 0],
    ];
    const ins = db.prepare(`INSERT INTO notifications (trigger,instance_id,channels,enabled) VALUES (?,?,?,?)`);
    for (const r of defaultRules) ins.run(...r);
    console.log('[DB] Seeded notification rules');
  }
}

seed();

module.exports = db;
