const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('C:/OTM-Assure/otm-assure.db');
db.prepare("DELETE FROM scenarios WHERE id != 'SC-01'").run();
db.prepare("DELETE FROM scenario_steps WHERE scenario_id != 'SC-01'").run();
console.log('Scenarios remaining:', db.prepare('SELECT COUNT(*) as c FROM scenarios').get().c);
