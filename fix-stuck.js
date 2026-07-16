const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('C:/OTM-Assure/otm-assure.db');
const stuck = db.prepare("SELECT id, status, created_at FROM runs WHERE status='running'").all();
console.log('Stuck runs:', stuck);
db.prepare("UPDATE runs SET status='completed', completed_at=datetime('now') WHERE status='running'").run();
db.prepare("UPDATE run_results SET status='fail' WHERE status='running'").run();
db.prepare("UPDATE run_steps SET status='skip' WHERE status='running'").run();
console.log('Fixed. Remaining running:', db.prepare("SELECT COUNT(*) as c FROM runs WHERE status='running'").get().c);
