const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('C:/OTM-Assure/otm-assure.db');

const scenarios = [
  ['SC-02','PO Import via Integration','Integration','Test_02_POImport.ts'],
  ['SC-03','Multi-Supplier Consolidation','Shipment','Test_03_Consolidation.ts'],
  ['SC-04','Rate Inquiry','Rating','Test_04_RateInquiry.ts'],
  ['SC-05','Document Attachment','Documents','Test_05_DocAttachment.ts'],
  ['SC-06','Outbound Shipment Planning','Shipment','Test_06_OutboundPlan.ts'],
  ['SC-07','Auto Tender to Carrier','Tendering','Test_07_AutoTender.ts'],
  ['SC-08','Multi-Stop Shipment','Shipment','Test_08_MultiStop.ts'],
  ['SC-09','Export Customs Documentation','Compliance','Test_09_CustomsDocs.ts'],
  ['SC-10','Carrier Rate Comparison','Rating','Test_10_RateComparison.ts'],
  ['SC-11','Invoice Generation & Approval','Finance','Test_11_Invoice.ts'],
  ['SC-12','Shipment Milestone Update','Visibility','Test_12_Milestone.ts'],
  ['SC-13','ERP Inbound Order Integration','Integration','Test_13_ERPInbound.ts'],
  ['SC-14','ERP Outbound Status Sync','Integration','Test_14_ERPOutbound.ts'],
  ['SC-15','Carrier Performance Report','Reporting','Test_15_CarrierReport.ts'],
];

const ins = db.prepare('INSERT OR IGNORE INTO scenarios (id,name,category,script,status,instances) VALUES (?,?,?,?,?,?)');
for (const s of scenarios) {
  ins.run(s[0], s[1], s[2], s[3], 'active', '["DEV","TST","UAT","PRD"]');
}

const steps = [
  ['SC-02',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-02',1,'Navigate to Integration','Integration menu is accessible'],
  ['SC-02',2,'Upload PO file','PO file accepted without validation errors'],
  ['SC-02',3,'Verify import success','PO import completes with success status'],
  ['SC-02',4,'Check auto plan triggered','Auto-planning triggered for imported PO'],
  ['SC-03',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-03',1,'Search multiple orders','Orders matching criteria are returned'],
  ['SC-03',2,'Select all suppliers','All supplier orders selected'],
  ['SC-03',3,'Consolidate shipment','Consolidation created without errors'],
  ['SC-03',4,'Verify consolidation','Consolidated shipment visible in shipment list'],
  ['SC-04',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-04',1,'Navigate to Rate Inquiry','Rate Inquiry screen opens'],
  ['SC-04',2,'Enter origin & destination','Origin and destination accepted'],
  ['SC-04',3,'Run rate lookup','Rate lookup executes without timeout'],
  ['SC-04',4,'Verify carrier rates','At least one carrier rate returned'],
  ['SC-05',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-05',1,'Navigate to shipment','Shipment record opens'],
  ['SC-05',2,'Open document panel','Document panel visible'],
  ['SC-05',3,'Upload document','Document uploaded without error'],
  ['SC-05',4,'Verify attachment','Attachment visible in document list'],
  ['SC-06',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-06',1,'Navigate to Order Release','Order Release screen opens'],
  ['SC-06',2,'Search sales order','Sales order found in results'],
  ['SC-06',3,'Plan outbound shipment','Shipment planned successfully'],
  ['SC-06',4,'Tender to carrier','Tender sent to carrier without error'],
  ['SC-07',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-07',1,'Verify auto tender triggered','Auto tender event visible in audit log'],
  ['SC-07',2,'Check carrier portal','Tender visible in carrier portal'],
  ['SC-07',3,'Accept tender','Tender accepted by carrier'],
  ['SC-07',4,'Verify execution','Shipment status updated to Confirmed'],
  ['SC-08',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-08',1,'Create multi-stop shipment','Shipment record created'],
  ['SC-08',2,'Add stop 1','First stop added successfully'],
  ['SC-08',3,'Add stop 2','Second stop added successfully'],
  ['SC-08',4,'Plan route','Route planned across all stops'],
  ['SC-08',5,'Execute','Shipment executed without errors'],
  ['SC-09',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-09',1,'Navigate to export shipment','Export shipment record opens'],
  ['SC-09',2,'Generate customs docs','Customs documents generated'],
  ['SC-09',3,'Verify documents','All required documents present and correct'],
  ['SC-10',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-10',1,'Run rate inquiry','Rate inquiry executes'],
  ['SC-10',2,'Compare carrier rates','Multiple carrier rates displayed'],
  ['SC-10',3,'Select cheapest carrier','Lowest-cost carrier selected'],
  ['SC-11',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-11',1,'Navigate to invoicing','Invoice screen opens'],
  ['SC-11',2,'Generate invoice','Invoice generated with correct amounts'],
  ['SC-11',3,'Approve invoice','Invoice approved without workflow errors'],
  ['SC-11',4,'Post to finance','Invoice posted to finance system'],
  ['SC-12',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-12',1,'Search shipment','Shipment found'],
  ['SC-12',2,'Update milestone','Milestone updated successfully'],
  ['SC-12',3,'Verify status change','Shipment status reflects updated milestone'],
  ['SC-13',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-13',1,'Trigger ERP integration','ERP integration event triggered'],
  ['SC-13',2,'Verify inbound order','Inbound order visible in OTM'],
  ['SC-13',3,'Check data mapping','All ERP fields mapped correctly to OTM fields'],
  ['SC-14',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-14',1,'Execute outbound status','Status update sent to ERP'],
  ['SC-14',2,'Verify ERP update','ERP reflects updated shipment status'],
  ['SC-14',3,'Confirm sync','No sync errors in integration log'],
  ['SC-15',0,'Login to OTM','OTM home page loads successfully'],
  ['SC-15',1,'Navigate to reporting','Reporting module opens'],
  ['SC-15',2,'Run carrier report','Carrier report generates without error'],
  ['SC-15',3,'Verify report data','Report contains carrier metrics for selected period'],
];

const insStep = db.prepare('INSERT OR IGNORE INTO scenario_steps (scenario_id,step_index,step_name,expected) VALUES (?,?,?,?)');
for (const s of steps) insStep.run(...s);

console.log('Scenarios:', db.prepare('SELECT COUNT(*) as c FROM scenarios').get().c);
console.log('Steps:', db.prepare('SELECT COUNT(*) as c FROM scenario_steps').get().c);
