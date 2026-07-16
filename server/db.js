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

  // Update SC-02 to real scenario if it was seeded with placeholder values
  db.prepare(`UPDATE scenarios SET name=?, script=? WHERE id='SC-02' AND script='Test_02_POImport.ts'`)
    .run('TR Order SAP Integration', 'Test_02_TROrderIntegration.ts');
}
migrate();

function seed() {
  const scenariosFile = path.join(__dirname, '..', 'scenarios', 'scenarios.json');
  const instancesFile = path.join(__dirname, '..', 'instances', 'instances.json');

  const existingScenarios = db.prepare('SELECT COUNT(*) as c FROM scenarios').get();
  if (existingScenarios.c === 0) {
    const scenarios = JSON.parse(fs.readFileSync(scenariosFile, 'utf8'));
    const ins = db.prepare(`INSERT OR IGNORE INTO scenarios (id,name,category,script,status,instances) VALUES (?,?,?,?,?,?)`);
    for (const s of scenarios) {
      ins.run(s.id, s.name, s.category, s.script, s.status, JSON.stringify(s.instances));
    }
    console.log(`[DB] Seeded ${scenarios.length} scenarios`);
  }

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
      ['SC-02',  0, 'Generate test order ID',                    'Order ID generated in format TR_YYYYMMDD_NNN'],
      ['SC-02',  1, 'Upload XML to WMServlet',                   'XML payload POSTed to /GC3/glog.integration.servlet.WMServlet with Basic Auth'],
      ['SC-02',  2, 'Verify WMServlet accepted',                 'HTTP 200 returned, no Error element in response body'],
      ['SC-02',  3, 'Wait for agent processing',                 'Agent OR_CREATED_SAP_V2_HEAVY_ACTIONS fires within 30s'],
      ['SC-02',  4, 'Login to OTM',                             'OTM home page loaded as LEL7597_TMS'],
      ['SC-02',  5, 'Navigate to Order Release',                 'Order Management > Order Release finder screen displayed'],
      ['SC-02',  6, 'Search for order',                          'Order TR_YYYYMMDD_001 found in OTM and opened'],
      ['SC-02',  7, 'Verify Buy Itinerary = TURKEY_ITINERARY',   'BUY_ITINERARY_PROFILE_GID = TMS.TURKEY_ITINERARY (agent step 10)'],
      ['SC-02',  8, 'Verify Fixed Itinerary = TURKEY_TO_ROE',    'FIXED_ITINERARY_GID = TMS.TURKEY_TO_ROE (agent step 21)'],
      ['SC-02',  9, 'Verify Movement Type = EXPORT',             'MOVEMENT_TYPE refnum = EXPORT (agent step 18)'],
      ['SC-02', 10, 'Verify Equipment Type = DRY/REEFER',        'EQUIPMENT_TYPE refnum = DRY or REEFER (agent step 15)'],
      ['SC-02', 11, 'Verify Order Indicator = W',                'Order indicator ≠ B — no DN in TX1 (agent step 29)'],
    ];
    const ins = db.prepare(`INSERT OR IGNORE INTO scenario_steps (scenario_id,step_index,step_name,expected) VALUES (?,?,?,?)`);
    for (const s of stepDefs) ins.run(...s);
    console.log('[DB] Seeded scenario step definitions');
  }

  // Migration: ensure SC-02 steps exist even if steps were seeded before SC-02 was added
  const sc02Steps = db.prepare('SELECT COUNT(*) as c FROM scenario_steps WHERE scenario_id=?').get('SC-02');
  if (sc02Steps.c === 0) {
    const sc02Defs = [
      ['SC-02',  0, 'Generate test order ID',                    'Order ID generated in format TR_YYYYMMDD_NNN'],
      ['SC-02',  1, 'Upload XML to WMServlet',                   'XML payload POSTed to /GC3/glog.integration.servlet.WMServlet with Basic Auth'],
      ['SC-02',  2, 'Verify WMServlet accepted',                 'HTTP 200 returned, no Error element in response body'],
      ['SC-02',  3, 'Wait for agent processing',                 'Agent OR_CREATED_SAP_V2_HEAVY_ACTIONS fires within 30s'],
      ['SC-02',  4, 'Login to OTM',                             'OTM home page loaded as LEL7597_TMS'],
      ['SC-02',  5, 'Navigate to Order Release',                 'Order Management > Order Release finder screen displayed'],
      ['SC-02',  6, 'Search for order',                          'Order TR_YYYYMMDD_001 found in OTM and opened'],
      ['SC-02',  7, 'Verify Buy Itinerary = TURKEY_ITINERARY',   'BUY_ITINERARY_PROFILE_GID = TMS.TURKEY_ITINERARY (set by agent step 10)'],
      ['SC-02',  8, 'Verify Fixed Itinerary = TURKEY_TO_ROE',    'FIXED_ITINERARY_GID = TMS.TURKEY_TO_ROE (set by agent step 21 for EXPORT)'],
      ['SC-02',  9, 'Verify Movement Type = EXPORT',             'MOVEMENT_TYPE refnum = EXPORT (source TR ≠ dest country, agent step 18)'],
      ['SC-02', 10, 'Verify Equipment Type = DRY/REEFER',        'EQUIPMENT_TYPE refnum = DRY or REEFER (agent step 15 based on dest equipment group)'],
      ['SC-02', 11, 'Verify Order Indicator = W',                'Order indicator ≠ B — no delivery note in TX1 so indicator stays W (agent step 29)'],
    ];
    const ins = db.prepare(`INSERT OR IGNORE INTO scenario_steps (scenario_id,step_index,step_name,expected) VALUES (?,?,?,?)`);
    for (const s of sc02Defs) ins.run(...s);
    console.log('[DB] Seeded SC-02 step definitions');
  }

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
