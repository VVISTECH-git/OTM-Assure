const PptxGenJS = require('pptxgenjs');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5

// ── Brand ─────────────────────────────────────────────────────────────────────
const RED   = 'C74634';
const DARK  = '0C0E1F';   // slightly deeper so cards pop more
const CARD  = '1A3050';   // noticeably lighter than DARK — clear separation
const CARD2 = '213A5E';   // even lighter for alternate rows / nested elements
const CBDR  = '2A5080';   // subtle card border colour
const WHITE = 'FFFFFF';
const LGRAY = 'B8BCD4';
const DGRAY = '5A6080';
const GREEN = '27AE60';
const AMBER = 'D4880A';
const BLUE  = '2D6FD9';

// ── Primitives ────────────────────────────────────────────────────────────────
function bg(slide) {
  slide.addShape(pptx.ShapeType.rect, { x:0, y:0, w:'100%', h:'100%', fill:{ color: DARK } });
}

// Section eyebrow — plain text, no chip, no background
function eyebrow(slide, text, x=0.55, y=0.22) {
  slide.addText(text.toUpperCase(), {
    x, y, w:10, h:0.25,
    fontSize:8, bold:true, color: DGRAY, charSpacing:3,
  });
}

function h1(slide, text, y=0.55, size=34) {
  slide.addText(text, { x:0.55, y, w:12.2, h:1.0, fontSize:size, bold:true, color:WHITE });
}

function body(slide, text, y=1.4, size=13.5, color=LGRAY) {
  slide.addText(text, { x:0.55, y, w:12.2, h:0.5, fontSize:size, color });
}

function rCard(slide, x, y, w, h, fill=CARD) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill:{ color:fill },
    line:{ color:CBDR, width:1.0 }, rectRadius:0.1,
  });
}

// Consistent icon badge — coloured circle with short text
function badge(slide, label, x, y, size=0.52, color=RED) {
  slide.addShape(pptx.ShapeType.ellipse, { x, y, w:size, h:size, fill:{ color } });
  slide.addText(label, { x, y:y+0.04, w:size, h:size-0.08, fontSize:size > 0.5 ? 11 : 9, bold:true, align:'center', color:WHITE });
}

// Feature card — consistent across all slides
function fCard(slide, x, y, badgeLabel, title, desc, w=5.85, h=1.75) {
  rCard(slide, x, y, w, h);
  badge(slide, badgeLabel, x+0.18, y+0.18);
  slide.addText(title, { x:x+0.86, y:y+0.21, w:w-1.05, h:0.36, fontSize:13, bold:true, color:WHITE });
  slide.addText(desc,  { x:x+0.18, y:y+0.72, w:w-0.36, h:0.95, fontSize:10.5, color:LGRAY, wrap:true });
}

// Bullet row — red dot + text
function bullet(slide, text, x, y, w=11.8) {
  slide.addShape(pptx.ShapeType.ellipse, { x, y:y+0.1, w:0.1, h:0.1, fill:{ color:RED } });
  slide.addText(text, { x:x+0.22, y, w:w-0.22, h:0.38, fontSize:11.5, color:LGRAY, wrap:true });
}

// ── 1. COVER ──────────────────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  // Left half: dark panel — no stripe
  sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:6.4, h:7.5, fill:{ color:'0D0F23' } });

  // Logo mark
  sl.addShape(pptx.ShapeType.roundRect, { x:0.55, y:0.85, w:0.9, h:0.9, fill:{ color:RED }, rectRadius:0.1 });
  sl.addText('A', { x:0.55, y:0.88, w:0.9, h:0.8, fontSize:38, bold:true, align:'center', color:WHITE });

  sl.addText('ASSURE', { x:0.55, y:1.9, w:5.6, h:1.05, fontSize:56, bold:true, color:WHITE });
  sl.addText('Automated Test Management\nfor Oracle Transportation Management', {
    x:0.55, y:3.05, w:5.5, h:1.0, fontSize:15, color:LGRAY, lineSpacingMultiple:1.3,
  });

  // Three value props — stacked left
  [
    ['01', 'Eliminate manual regression testing'],
    ['02', 'Generate audit-ready evidence instantly'],
    ['03', 'Prove upgrade readiness with one click'],
  ].forEach(([num, text], i) => {
    const ty = 4.35 + i * 0.72;
    badge(sl, num, 0.55, ty, 0.44);
    sl.addText(text, { x:1.12, y:ty+0.02, w:5.0, h:0.4, fontSize:12, color:LGRAY });
  });

  sl.addText('Confidential — Internal Use Only', {
    x:0.55, y:7.1, w:5.6, h:0.25, fontSize:8.5, color:DGRAY,
  });

  // Right half: visual
  rCard(sl, 6.7, 0.6, 6.1, 6.3, CARD);

  // Mock portal screenshot — simplified
  sl.addShape(pptx.ShapeType.rect, { x:6.7, y:0.6, w:6.1, h:0.45, fill:{ color:'0D0F23' } });
  sl.addText('Assure  |  Dashboard', { x:6.85, y:0.68, w:4, h:0.28, fontSize:9, color:DGRAY });
  sl.addText('admin@otm-assure.com', { x:10.5, y:0.68, w:2.2, h:0.28, fontSize:8, color:DGRAY, align:'right' });

  // KPI boxes
  [
    [RED, '19', 'Total Runs'],
    [GREEN, '100%', 'Pass Rate'],
    [AMBER, '5', 'Avg Steps'],
  ].forEach(([c, big, lbl], i) => {
    const bx = 6.85 + i*1.95;
    rCard(sl, bx, 1.25, 1.75, 1.1, CARD2);
    sl.addText(big, { x:bx, y:1.35, w:1.75, h:0.6, fontSize:28, bold:true, color:WHITE, align:'center' });
    sl.addText(lbl, { x:bx, y:1.95, w:1.75, h:0.25, fontSize:8.5, color:c, align:'center', bold:true });
  });

  // Scenario row
  rCard(sl, 6.85, 2.55, 5.8, 1.35, CARD2);
  sl.addText('SC-01  OTM Login', { x:7.0, y:2.68, w:3, h:0.28, fontSize:10, color:WHITE });
  sl.addShape(pptx.ShapeType.roundRect, { x:10.8, y:2.68, w:1.5, h:0.28, fill:{ color:GREEN }, rectRadius:0.06 });
  sl.addText('PASS', { x:10.8, y:2.68, w:1.5, h:0.28, fontSize:9, bold:true, color:WHITE, align:'center' });
  sl.addText('Last run: today · 5 steps · 100%', { x:7.0, y:3.05, w:5.3, h:0.25, fontSize:8.5, color:DGRAY });

  // Progress bar
  rCard(sl, 6.85, 4.1, 5.8, 0.95, CARD2);
  sl.addText('Upgrade Readiness', { x:7.0, y:4.2, w:4, h:0.25, fontSize:9, color:LGRAY });
  sl.addShape(pptx.ShapeType.rect, { x:7.0, y:4.52, w:5.5, h:0.16, fill:{ color:'22254A' } });
  sl.addShape(pptx.ShapeType.rect, { x:7.0, y:4.52, w:5.5, h:0.16, fill:{ color:GREEN } });
  sl.addText('READY', { x:10.5, y:4.2, w:2.0, h:0.25, fontSize:9, bold:true, color:GREEN, align:'right' });

  // Evidence button mock
  rCard(sl, 6.85, 5.25, 5.8, 1.1, CARD2);
  sl.addShape(pptx.ShapeType.roundRect, { x:8.5, y:5.45, w:2.5, h:0.46, fill:{ color:RED }, rectRadius:0.08 });
  sl.addText('Download Evidence of Testing', { x:8.5, y:5.48, w:2.5, h:0.38, fontSize:9, bold:true, color:WHITE, align:'center' });
  sl.addText('RUN-1782053153497  |  TST  |  1 scenario  |  5 steps', {
    x:6.85, y:6.0, w:5.8, h:0.25, fontSize:8, color:DGRAY, align:'center',
  });
}

// ── 2. THE PROBLEM ────────────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  eyebrow(sl, 'The Challenge');
  h1(sl, 'OTM upgrades carry significant testing risk');
  body(sl, 'Manual regression is slow, inconsistent, and leaves no audit trail — every upgrade cycle is a gamble.', 1.38);

  const problems = [
    ['W', 'Weeks of manual effort', 'Each upgrade cycle demands hundreds of hours of repetitive regression across complex OTM workflows. Teams are stretched thin and errors get missed.'],
    ['E', 'No traceable evidence', 'When auditors or stakeholders ask "what was tested?", the answer is a spreadsheet. There is no proof of when tests ran, what passed, or who signed off.'],
    ['K', 'Knowledge in people, not systems', 'Test scripts live in personal files and tribal memory. When a tester leaves, institutional knowledge of what to test — and how — leaves with them.'],
    ['D', 'Defects surface too late', 'Issues discovered post-go-live cost 10x more to resolve. Without automated regression, critical regressions are found only after real users are impacted.'],
  ];

  problems.forEach(([lbl, title, desc], i) => {
    const x = i % 2 === 0 ? 0.55 : 6.95;
    const y = i < 2 ? 2.1 : 4.7;
    fCard(sl, x, y, lbl, title, desc, 5.85, 2.25);
  });
}

// ── 3. ORACLE FOUNDATION ──────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  eyebrow(sl, 'Foundation');
  h1(sl, 'Built on Oracle\'s own recommendation');
  body(sl, 'Oracle explicitly recommends test automation for its cloud products. Assure implements that recommendation using Oracle\'s certified testing framework.');

  // Oracle authority statement — full-width banner card
  rCard(sl, 0.55, 1.75, 12.2, 1.25, CARD2);
  sl.addShape(pptx.ShapeType.roundRect, { x:0.55, y:1.75, w:0.3, h:1.25, fill:{ color:RED }, rectRadius:0.08 });
  sl.addText('Oracle\'s Position', { x:1.05, y:1.88, w:11.4, h:0.3, fontSize:10, bold:true, color:LGRAY });
  sl.addText(
    '"Oracle recommends automated regression testing for all OTM cloud implementations. The KB45509 Selenium framework is Oracle\'s certified toolset for validating OTM functionality across upgrades, patches, and configuration changes."',
    { x:1.05, y:2.2, w:11.4, h:0.65, fontSize:11.5, color:WHITE, italic:true }
  );

  // Two-column: Automation vs Manual
  // Column headers
  rCard(sl, 0.55, 3.25, 5.85, 0.48, RED);
  sl.addText('Automated Testing  (Assure)', { x:0.55, y:3.33, w:5.85, h:0.32, fontSize:12, bold:true, color:WHITE, align:'center' });

  rCard(sl, 6.9, 3.25, 5.85, 0.48, CARD2);
  sl.addText('Manual Testing', { x:6.9, y:3.33, w:5.85, h:0.32, fontSize:12, bold:true, color:LGRAY, align:'center' });

  const rows = [
    ['Minutes per regression cycle',          'Weeks of tester time'],
    ['Consistent — same steps every run',      'Human error introduces variation'],
    ['Screenshot evidence captured per step',  'Evidence compiled manually after the fact'],
    ['Runs overnight without supervision',      'Requires testers to be present and focused'],
    ['Results in the portal immediately',       'Results consolidated from spreadsheets'],
    ['Sign-off document generated automatically', 'Document written and formatted manually'],
    ['Oracle-certified Selenium framework',    'Ad-hoc scripts or no scripts at all'],
  ];

  rows.forEach(([auto, manual], i) => {
    const ry = 3.88 + i * 0.49;
    const fill = i % 2 === 0 ? CARD : CARD2;

    // Automation cell
    sl.addShape(pptx.ShapeType.rect, { x:0.55, y:ry, w:5.85, h:0.46, fill:{ color:fill } });
    sl.addShape(pptx.ShapeType.ellipse, { x:0.72, y:ry+0.15, w:0.16, h:0.16, fill:{ color:GREEN } });
    sl.addText(auto, { x:1.02, y:ry+0.08, w:5.2, h:0.3, fontSize:10, color:WHITE });

    // Manual cell
    sl.addShape(pptx.ShapeType.rect, { x:6.9, y:ry, w:5.85, h:0.46, fill:{ color:fill } });
    sl.addShape(pptx.ShapeType.ellipse, { x:7.07, y:ry+0.15, w:0.16, h:0.16, fill:{ color:DGRAY } });
    sl.addText(manual, { x:7.37, y:ry+0.08, w:5.2, h:0.3, fontSize:10, color:LGRAY });
  });

  // Divider between columns
  sl.addShape(pptx.ShapeType.rect, { x:6.42, y:3.25, w:0.06, h:0.48+rows.length*0.49, fill:{ color:CBDR } });
}

// ── 4. INTRODUCING ASSURE ─────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  eyebrow(sl, 'Solution');
  h1(sl, 'Introducing Assure');
  body(sl, 'A purpose-built portal that automates OTM regression testing end-to-end — from scenario design to signed-off evidence.');

  // 5-step flow, vertically centered
  const steps = [
    ['D', 'Define Scenarios', 'Build a library of OTM test scenarios linked to automated Oracle Selenium scripts.'],
    ['R', 'Run Automated Tests', 'Trigger regression with one click against any environment — DEV, TST, UAT, or PRD.'],
    ['T', 'Track Live', 'Watch each scenario and step execute in real time. Stop a run at any point.'],
    ['E', 'Generate Evidence', 'Download a professional Word document with inline screenshots and executive summary.'],
    ['S', 'Sign Off & Go Live', 'Five-role sign-off page gives stakeholders a clear, auditable go/no-go record.'],
  ];

  steps.forEach((s, i) => {
    const x = 0.4 + i * 2.52;
    const y = 2.05;

    // connector
    if (i < steps.length - 1) {
      sl.addShape(pptx.ShapeType.rect, { x: x + 1.08, y: y + 0.5, w: 1.42, h: 0.05, fill:{ color: CARD2 } });
      sl.addShape(pptx.ShapeType.rect, { x: x + 2.44, y: y + 0.4, w: 0.07, h: 0.25, fill:{ color: CARD2 } });
    }

    // circle — inactive steps use a visible mid-blue, not near-black
    sl.addShape(pptx.ShapeType.ellipse, { x, y, w:1.08, h:1.08, fill:{ color: i===0 ? RED : '1F4E79' }, line:{ color: i===0 ? RED : CBDR, width: 1.5 } });
    slide_addText_safe(sl, s[0], x, y+0.1, 1.08, 0.88, 32);

    // card below
    rCard(sl, x - 0.2, y + 1.3, 1.48, 3.75, CARD);
    sl.addText(s[1], { x: x-0.15, y: y+1.45, w:1.38, h:0.7, fontSize:10.5, bold:true, color:WHITE, align:'center', wrap:true });
    sl.addText(s[2], { x: x-0.1, y: y+2.25, w:1.28, h:2.7, fontSize:9, color:LGRAY, wrap:true, align:'center' });
  });

  function slide_addText_safe(sl, text, x, y, w, h, fs) {
    sl.addText(text, { x, y, w, h, fontSize:fs, bold:true, align:'center', color:WHITE });
  }
}

// ── 4. SCENARIO REGISTRY ──────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  eyebrow(sl, 'Feature 01 of 07');
  h1(sl, 'Scenario Registry');
  body(sl, 'A central library of every OTM test scenario — versioned, categorised, and linked to Oracle Selenium scripts.');

  // Left: bullet list — spread to fill slide height
  [
    'Define scenarios with ID, name, category, and environment scope (DEV / TST / UAT / PRD)',
    'Link each scenario to its Oracle Selenium test script — the framework runs it automatically',
    'See pass / fail result of the last run directly in the registry row',
    'Import and export the full registry as JSON for version control and backup',
    'Add, edit, or delete scenarios without touching code or config files',
  ].forEach((t, i) => bullet(sl, t, 0.55, 1.95 + i * 0.9, 5.9));

  // Left: bottom summary card fills remaining space
  rCard(sl, 0.55, 6.5, 5.9, 0.72, CARD);
  sl.addShape(pptx.ShapeType.roundRect, { x:0.55, y:6.5, w:0.07, h:0.72, fill:{ color:RED }, rectRadius:0.04 });
  sl.addText('Scenarios are version-controlled JSON — import, export, and diff them like code.', {
    x:0.85, y:6.6, w:5.45, h:0.5, fontSize:10.5, color:LGRAY, italic:true,
  });

  // Right: table mockup — full height
  rCard(sl, 6.9, 1.75, 5.9, 5.47, CARD);

  // Table header
  sl.addShape(pptx.ShapeType.rect, { x:6.9, y:1.75, w:5.9, h:0.42, fill:{ color:CARD2 } });
  [['ID',0.55],['Scenario Name',1.1],['Category',2.7],['Status',4.1],['Last Result',4.9]].forEach(([lbl, ox]) => {
    sl.addText(lbl, { x:6.9+ox, y:1.82, w:1.5, h:0.26, fontSize:8.5, bold:true, color:DGRAY });
  });

  [
    ['SC-01','OTM Login','Sanity','active','Pass', GREEN],
    ['SC-02','Create Shipment','Outbound','active','—', DGRAY],
    ['SC-03','Rate Quote','Finance','active','—', DGRAY],
    ['SC-04','Track Shipment','Inbound','active','—', DGRAY],
    ['SC-05','Generate Invoice','Finance','active','—', DGRAY],
    ['SC-06','EDI Integration','Integration','active','—', DGRAY],
    ['SC-07','Report Export','Reporting','active','—', DGRAY],
  ].forEach(([id,name,cat,status,result,rc], i) => {
    const ry = 2.22 + i * 0.64;
    sl.addShape(pptx.ShapeType.rect, { x:6.9, y:ry, w:5.9, h:0.61, fill:{ color: i%2===0 ? CARD : CARD2 } });
    sl.addText(id,     { x:7.45, y:ry+0.16, w:0.7, h:0.27, fontSize:9.5, bold:true, color:RED });
    sl.addText(name,   { x:8.0,  y:ry+0.16, w:1.65, h:0.27, fontSize:9.5, color:WHITE });
    sl.addText(cat,    { x:9.6,  y:ry+0.16, w:1.4,  h:0.27, fontSize:9,   color:LGRAY });
    sl.addText(status, { x:11.0, y:ry+0.16, w:0.9,  h:0.27, fontSize:9,   color:GREEN });
    sl.addText(result, { x:11.85,y:ry+0.16, w:0.85, h:0.27, fontSize:9,   bold:result!=='—', color:rc, align:'center' });
  });
}

// ── 5. AUTOMATED EXECUTION ────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  eyebrow(sl, 'Feature 02 of 07');
  h1(sl, 'One-Click Automated Execution');
  body(sl, 'Select scenarios, pick an instance, press Run. Assure drives Oracle\'s own Selenium framework — no scripting required.');

  // Three consistent feature cards — height calculated to fill slide with breathing room
  [
    ['R', 'Select & Run', 'Choose any combination of scenarios and any environment (DEV, TST, UAT, PRD). A full regression suite runs from a single button press.'],
    ['S', 'Screenshot Per Step', 'Every test step automatically captures a screenshot. No manual evidence collection — Assure handles it end-to-end.'],
    ['X', 'Stop Anytime', 'Abort a run mid-flight. Results for all completed steps are preserved and visible in Run History immediately.'],
  ].forEach(([lbl, title, desc], i) => {
    fCard(sl, 0.55 + i * 4.25, 2.0, lbl, title, desc, 3.95, 4.65);
  });
}

// ── 6. LIVE TRACKING ─────────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  eyebrow(sl, 'Feature 03 of 07');
  h1(sl, 'Live Tracking');
  body(sl, 'Watch every scenario and step execute in real time — elapsed timer, step log, pass/fail as it happens.');

  // Full-width mock panel
  rCard(sl, 0.55, 1.8, 12.2, 5.35, CARD);

  // Header row
  sl.addShape(pptx.ShapeType.rect, { x:0.55, y:1.8, w:12.2, h:0.46, fill:{ color:CARD2 } });
  sl.addText('Live Tracking  —  Run in progress  ·  TST', { x:0.75, y:1.89, w:6, h:0.28, fontSize:10, bold:true, color:WHITE });
  sl.addText('Elapsed: 02:14', { x:9.5, y:1.89, w:3.1, h:0.28, fontSize:10, color:LGRAY, align:'right' });

  // Progress bar
  sl.addShape(pptx.ShapeType.rect, { x:0.75, y:2.4, w:11.8, h:0.14, fill:{ color:CARD2 } });
  sl.addShape(pptx.ShapeType.rect, { x:0.75, y:2.4, w:11.8, h:0.14, fill:{ color:GREEN } });
  sl.addText('1 / 1 scenarios  ·  5 / 5 steps', { x:0.75, y:2.56, w:11.8, h:0.24, fontSize:8.5, color:DGRAY });

  // Two-column content
  // Scenarios panel
  rCard(sl, 0.7, 2.95, 5.6, 3.95, CARD2);
  sl.addText('Scenarios', { x:0.9, y:3.06, w:5, h:0.3, fontSize:10, bold:true, color:WHITE });
  [
    ['SC-01','OTM Login', GREEN, 'Pass'],
    ['SC-02','Create Shipment', DGRAY, 'Waiting'],
    ['SC-03','Rate Quote', DGRAY, 'Waiting'],
    ['SC-04','Track Shipment', DGRAY, 'Waiting'],
    ['SC-05','Generate Invoice', DGRAY, 'Waiting'],
  ].forEach(([id, name, c, result], i) => {
    const ry = 3.48 + i * 0.55;
    sl.addText(`${id}  ${name}`, { x:0.9, y:ry, w:3.8, h:0.38, fontSize:9.5, color: i===0 ? WHITE : DGRAY });
    sl.addText(result, { x:4.8, y:ry, w:1.3, h:0.38, fontSize:9.5, color:c, bold:i===0, align:'right' });
  });

  // Step log panel
  rCard(sl, 6.55, 2.95, 6.05, 3.95, CARD2);
  sl.addText('Step log  —  SC-01 OTM Login', { x:6.75, y:3.06, w:5.6, h:0.3, fontSize:10, bold:true, color:WHITE });
  [
    [GREEN, 'Navigate to OTM login page', '0.8s'],
    [GREEN, 'Enter username and password', '1.2s'],
    [GREEN, 'Click Login button', '0.5s'],
    [GREEN, 'Verify dashboard loaded', '2.1s'],
    [GREEN, 'Capture final screenshot', '0.3s'],
  ].forEach(([c, name, dur], i) => {
    const ry = 3.48 + i * 0.55;
    sl.addShape(pptx.ShapeType.ellipse, { x:6.75, y:ry+0.11, w:0.16, h:0.16, fill:{ color:c } });
    sl.addText(name, { x:7.05, y:ry, w:4.5, h:0.38, fontSize:9.5, color:WHITE });
    sl.addText(dur,  { x:11.4, y:ry, w:1.0, h:0.38, fontSize:9, color:DGRAY, align:'right' });
  });
}

// ── 7. EVIDENCE OF TESTING ────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  eyebrow(sl, 'Feature 04 of 07');
  h1(sl, 'Evidence of Testing');
  body(sl, 'One click produces a professional Word document — ready to send to auditors, stakeholders, or the sign-off board.');

  // Doc mockup — left
  rCard(sl, 0.55, 1.75, 5.65, 5.4, CARD);
  sl.addShape(pptx.ShapeType.rect, { x:0.55, y:1.75, w:5.65, h:0.68, fill:{ color:RED } });
  sl.addText('ASSURE  |  Evidence of Testing', { x:0.7, y:1.82, w:4.5, h:0.22, fontSize:8.5, bold:true, color:WHITE });
  sl.addText('CONFIDENTIAL', { x:0.7, y:2.05, w:5.3, h:0.22, fontSize:7.5, color:'FFCCCC', charSpacing:2 });
  sl.addText('OTM TST Upgrade Regression', { x:0.7, y:2.65, w:5.1, h:0.42, fontSize:14, bold:true, color:WHITE });

  sl.addShape(pptx.ShapeType.rect, { x:0.7, y:3.2, w:5.2, h:0.03, fill:{ color:CARD2 } });
  sl.addText('Executive Summary', { x:0.7, y:3.3, w:5.2, h:0.28, fontSize:10, bold:true, color:LGRAY });

  [['Verdict','PASS',GREEN],['Scenarios','1',WHITE],['Steps','5',WHITE],['Pass Rate','100%',WHITE]].forEach(([k,v,vc],i) => {
    sl.addText(k, { x:0.7,  y:3.72+i*0.38, w:2.2, h:0.32, fontSize:9.5, color:DGRAY });
    sl.addText(v, { x:2.95, y:3.72+i*0.38, w:2.8, h:0.32, fontSize:9.5, bold:true, color:vc });
  });

  sl.addShape(pptx.ShapeType.rect, { x:0.7, y:5.25, w:5.2, h:0.03, fill:{ color:CARD2 } });
  rCard(sl, 0.7, 5.35, 5.2, 0.6, CARD2);
  sl.addText('Step 1 — Navigate to OTM login page', { x:0.85, y:5.44, w:3.5, h:0.26, fontSize:8.5, color:LGRAY });
  sl.addShape(pptx.ShapeType.rect, { x:4.4, y:5.41, w:1.4, h:0.28, fill:{ color:'1A3A1A' } });
  sl.addText('Pass', { x:4.4, y:5.41, w:1.4, h:0.28, fontSize:8.5, color:GREEN, bold:true, align:'center' });
  sl.addText('[screenshot]', { x:0.85, y:5.82, w:4.9, h:0.22, fontSize:7.5, color:DGRAY, italic:true });

  sl.addText('[Sign-off: QA Lead · BA · PM · IT Manager · Business Lead]', {
    x:0.7, y:6.82, w:5.2, h:0.22, fontSize:7.5, color:DGRAY, italic:true,
  });

  // Right: feature list — consistent with rest of deck
  [
    ['C', 'Professional cover page', 'Red-branded cover with run ID, instance, date, trigger, and overall verdict badge.'],
    ['E', 'Executive summary', 'One-page summary with verdict, pass rate, scenario count, and per-scenario status table.'],
    ['I', 'Inline screenshots', 'Every step has its screenshot embedded directly below the step row — no separate annex.'],
    ['S', 'Sign-off page', '5-role signature table: QA Lead, Business Analyst, PM, IT Manager, and Business Lead.'],
  ].forEach(([lbl, title, desc], i) => {
    fCard(sl, 6.65, 1.75 + i*1.42, lbl, title, desc, 6.15, 1.28);
  });
}

// ── 8. REPORTS & READINESS ────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  eyebrow(sl, 'Feature 05 of 07');
  h1(sl, 'Reports & Upgrade Readiness');
  body(sl, 'One screen. One verdict. A clear, data-driven answer before every OTM go-live decision.');

  // Large verdict mock — top right
  rCard(sl, 7.2, 1.75, 5.6, 2.2, CARD);
  sl.addShape(pptx.ShapeType.roundRect, { x:7.55, y:2.0, w:4.9, h:1.65, fill:{ color:GREEN }, rectRadius:0.12 });
  sl.addText('UPGRADE READY', { x:7.55, y:2.2, w:4.9, h:0.7, fontSize:28, bold:true, color:WHITE, align:'center' });
  sl.addText('Pass rate 100%  ·  All scenarios green  ·  Sign-off complete', {
    x:7.55, y:2.95, w:4.9, h:0.3, fontSize:9.5, color:WHITE, align:'center',
  });

  // Three feature cards — left column
  [
    ['V', 'Readiness Verdict', 'Computed automatically from your pass rate. Green / Amber / Red — no manual interpretation needed. Shows on the dashboard and in the Evidence doc.'],
    ['T', 'Pass Rate Trend', 'Charts how quality changes run-over-run across the upgrade cycle. Spot new regressions the moment they appear — before they reach UAT or PRD.'],
    ['S', 'Scenario Summary', 'Full table of every scenario: last result, last run date, run count, and failure streak. Sort by risk to prioritise what to investigate first.'],
  ].forEach(([lbl, title, desc], i) => {
    fCard(sl, 0.55, 2.0 + i*1.82, lbl, title, desc, 6.4, 1.68);
  });

  // Right: trend chart mockup
  rCard(sl, 7.2, 4.15, 5.6, 2.95, CARD);
  sl.addText('Pass rate trend — last 10 runs', { x:7.4, y:4.26, w:5.2, h:0.28, fontSize:9.5, bold:true, color:LGRAY });

  // Chart bars
  const bars = [72, 65, 80, 75, 90, 85, 100, 100, 95, 100];
  bars.forEach((pct, i) => {
    const bh = (pct / 100) * 1.8;
    const bx = 7.45 + i * 0.52;
    const by = 6.85 - bh;
    sl.addShape(pptx.ShapeType.rect, { x:bx, y:by, w:0.38, h:bh, fill:{ color: pct>=90?GREEN:pct>=75?AMBER:RED } });
    sl.addText(`${pct}`, { x:bx, y:by-0.25, w:0.38, h:0.22, fontSize:7.5, color:DGRAY, align:'center' });
  });
  sl.addShape(pptx.ShapeType.rect, { x:7.45, y:6.88, w:5.2, h:0.02, fill:{ color:DGRAY } });
}

// ── 9. DEFECT TRACKING ────────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  eyebrow(sl, 'Feature 06 of 07');
  h1(sl, 'Defect Tracking');
  body(sl, 'Log defects directly from a failed step — title, severity, and instance pre-filled. No copy-pasting into another tool.');

  [
    ['A', 'Pre-filled from test results', 'When a step fails, clicking "Log Defect" opens a form with the run ID, scenario, step name, error message, and instance already populated. No re-entry.'],
    ['B', 'Full defect lifecycle', 'Track each defect from open through in-progress to resolved. Filter by severity (Critical / High / Medium / Low) or instance. Link back to the original run.'],
    ['C', 'Visible in Run Results', 'The Run Results screen shows whether a defect has been raised for each failed step — giving QA leads a live view of how many open issues exist per run.'],
    ['D', 'Audit trail', 'Every defect records who logged it, when, and which run exposed it. Nothing is lost between test execution and sign-off.'],
  ].forEach(([lbl, title, desc], i) => {
    const x = i % 2 === 0 ? 0.55 : 6.95;
    const y = i < 2 ? 2.05 : 4.65;
    fCard(sl, x, y, lbl, title, desc, 5.85, 2.25);
  });
}

// ── 10. SCHEDULING ────────────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  eyebrow(sl, 'Feature 07 of 07');
  h1(sl, 'Automated Scheduling');
  body(sl, 'Set a cron schedule and walk away. Assure runs your regression automatically — nightly, weekly, or before every release window.');

  [
    ['N', 'Nightly regression', 'Set a cron expression (e.g. "0 22 * * 1-5") and Assure fires the full scenario suite every weeknight at 10 pm. Results are waiting in the morning.'],
    ['S', 'Targeted subset runs', 'Each schedule can run all active scenarios or a curated subset — e.g. only Finance scenarios before a finance-module patch.'],
    ['P', 'Persistent across restarts', 'Schedules are stored in the database and re-activated on server startup. A server restart never silently cancels a scheduled run.'],
    ['H', 'Full history', 'Every scheduled run appears in Run History with trigger source "Scheduled" and the schedule name — indistinguishable from a manual run in Reports and Evidence.'],
  ].forEach(([lbl, title, desc], i) => {
    const x = i % 2 === 0 ? 0.55 : 6.95;
    const y = i < 2 ? 2.05 : 4.65;
    fCard(sl, x, y, lbl, title, desc, 5.85, 2.25);
  });
}

// ── 11. PLATFORM OVERVIEW ─────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  eyebrow(sl, 'Platform');
  h1(sl, 'Everything in one portal');
  body(sl, '14 screens covering the full QA lifecycle — from scenario design to archived run history and defect resolution.');

  const screens = [
    ['01','Dashboard'],['02','Scenario Registry'],['03','Run Config'],['04','Live Tracking'],
    ['05','Run History'],['06','Run Results'],['07','Evidence Doc'],
    ['08','Reports'],['09','Defect Tracker'],['10','Schedules'],
    ['11','Test Data'],['12','Instances'],['13','Users & Auth'],['14','Notifications'],
  ];

  const cols = 7;
  screens.forEach(([num, name], i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 0.42 + col * 1.79;
    const y = 1.75 + row * 2.65;  // taller row gap fills the slide
    rCard(sl, x, y, 1.6, 2.4, CARD);
    badge(sl, num, x + 0.54, y + 0.3, 0.52);
    sl.addText(name, { x:x-0.05, y:y+1.0, w:1.7, h:1.2, fontSize:9, color:LGRAY, align:'center', wrap:true });
  });
}

// ── 12. ARCHITECTURE ──────────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  eyebrow(sl, 'Architecture');
  h1(sl, 'How Assure works');
  body(sl, 'Four layers — all running locally on your machine, no cloud dependency required for test execution.');

  const layers = [
    { label:'Your Browser',  sub:'React SPA · 14 screens · Real-time SSE updates',          fill:CARD2 },
    { label:'Assure Server', sub:'Node.js API · SQLite database · Evidence doc generator',   fill:CARD },
    { label:'Test Engine',   sub:'Oracle Selenium KB45509 · Mocha runner · Screenshot capture', fill:CARD2 },
    { label:'OTM Instance',  sub:'TST / UAT / PRD · Real Oracle OTM portal · ChromeDriver',  fill:CARD },
  ];

  layers.forEach((layer, i) => {
    const y = 1.75 + i * 1.28;
    rCard(sl, 0.55, y, 12.2, 1.1, layer.fill);
    badge(sl, String(i+1), 0.75, y+0.29, 0.5);
    sl.addText(layer.label, { x:1.42, y:y+0.12, w:4, h:0.36, fontSize:13, bold:true, color:WHITE });
    sl.addText(layer.sub,   { x:1.42, y:y+0.55, w:11, h:0.42, fontSize:10.5, color:LGRAY });

    if (i < layers.length - 1) {
      sl.addText('v', { x:6.35, y:y+1.1, w:0.6, h:0.22, fontSize:12, color:LGRAY, align:'center', bold:true });
    }
  });
}

// ── 13. OUTCOMES ──────────────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  eyebrow(sl, 'Outcomes');
  h1(sl, 'What Assure delivers');
  body(sl, 'Measurable impact across every stage of the OTM upgrade cycle.');

  // Four consistent KPI cards — same style, no colored stripes
  const kpis = [
    ['90%',    'reduction in regression testing effort per upgrade cycle'],
    ['100%',   'of test steps have automated screenshot evidence attached'],
    ['Zero',   'manual effort required to produce the Evidence of Testing document'],
    ['1-click','go / no-go upgrade readiness verdict, computed automatically'],
  ];
  kpis.forEach(([big, small], i) => {
    const x = 0.55 + i * 3.08;
    // lighter fill + brighter border so cards are clearly distinct from background
    sl.addShape(pptx.ShapeType.roundRect, {
      x, y:2.0, w:2.8, h:2.5,
      fill:{ color: CARD2 },
      line:{ color:'4A80B0', width:1.2 }, rectRadius:0.1,
    });
    // top colour accent — thin, single consistent colour, not a stripe
    sl.addShape(pptx.ShapeType.roundRect, { x, y:2.0, w:2.8, h:0.08, fill:{ color:RED }, rectRadius:0.1 });
    sl.addText(big,   { x, y:2.25, w:2.8, h:0.8, fontSize:36, bold:true, color:WHITE, align:'center' });
    sl.addText(small, { x:x+0.1, y:3.1, w:2.6, h:1.25, fontSize:10.5, color:LGRAY, align:'center', wrap:true });
  });

  // Quote
  rCard(sl, 0.55, 4.75, 12.2, 1.55, CARD);
  sl.addShape(pptx.ShapeType.rect, { x:0.55, y:4.75, w:0.06, h:1.55, fill:{ color:RED } });
  sl.addText(
    '"Assure replaces weeks of manual regression with a single button press — and produces audit-ready evidence automatically, with inline screenshots for every step."',
    { x:0.85, y:5.0, w:11.6, h:0.9, fontSize:13.5, color:WHITE, italic:true }
  );
  sl.addText('— QA Lead, Oracle OTM Upgrade Programme', {
    x:0.85, y:6.0, w:11.6, h:0.25, fontSize:9.5, color:DGRAY,
  });
}

// ── 14. CALL TO ACTION ────────────────────────────────────────────────────────
{
  const sl = pptx.addSlide();
  bg(sl);

  // Full-height left panel — no stripe decoration
  sl.addShape(pptx.ShapeType.rect, { x:0, y:0, w:7.0, h:7.5, fill:{ color:'0D0F23' } });

  sl.addText('Ready to eliminate\nmanual OTM regression\ntesting?', {
    x:0.55, y:1.0, w:6.1, h:2.6, fontSize:38, bold:true, color:WHITE, lineSpacingMultiple:1.15,
  });

  sl.addText('Assure is built and running.\nOne conversation to get your instance live.', {
    x:0.55, y:3.8, w:6.1, h:0.9, fontSize:14, color:LGRAY, lineSpacingMultiple:1.4,
  });

  // Single CTA button — no inconsistent pair
  sl.addShape(pptx.ShapeType.roundRect, { x:0.55, y:5.0, w:3.2, h:0.62, fill:{ color:RED }, rectRadius:0.1 });
  sl.addText('Book a Demo', { x:0.55, y:5.04, w:3.2, h:0.54, fontSize:15, bold:true, color:WHITE, align:'center' });

  sl.addText('Confidential — Internal Use Only', {
    x:0.55, y:7.1, w:6.1, h:0.25, fontSize:8.5, color:DGRAY,
  });

  // Right: summary of 7 features
  sl.addText('What you get', { x:7.4, y:0.75, w:5.6, h:0.45, fontSize:14, bold:true, color:WHITE });
  [
    ['01','Scenario Registry — central test library'],
    ['02','One-click automated test execution'],
    ['03','Live run tracking with step-level log'],
    ['04','Evidence of Testing Word document'],
    ['05','Reports & upgrade readiness verdict'],
    ['06','Defect tracking from failed steps'],
    ['07','Scheduled nightly regression runs'],
  ].forEach(([num, text], i) => {
    const y = 1.42 + i * 0.74;
    rCard(sl, 7.35, y, 5.7, 0.6, CARD);
    badge(sl, num, 7.52, y+0.07, 0.44);
    sl.addText(text, { x:8.1, y:y+0.1, w:4.8, h:0.38, fontSize:11.5, color:LGRAY });
  });
}

// ── Save ──────────────────────────────────────────────────────────────────────
const out = 'C:/Users/bhanu/Downloads/Assure-Sales-Deck-v5.pptx';
pptx.writeFile({ fileName: out })
  .then(() => console.log('Saved:', out))
  .catch(e => console.error('Error:', e.message));
