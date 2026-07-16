const path = require('path');
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ImageRun, Header, Footer,
  ShadingType, PageNumber, UnderlineType, VerticalAlign,
} = require('docx');
const db = require('./db');

const SCREENSHOTS_PATH = path.join(__dirname, '..', 'screenshots');

const C = {
  brand:     'C0392B',
  brandDark: '922B21',
  brandLight:'FADBD8',
  green:     '1E8449',
  greenBg:   'EAFAF1',
  greenText: '145A32',
  red:       'C0392B',
  redBg:     'FDEDEC',
  amber:     'D68910',
  navy:      '1A2F4B',
  darkGray:  '2C3E50',
  midGray:   '566573',
  lightGray: 'F4F6F7',
  border:    'D5D8DC',
  white:     'FFFFFF',
};

const MARGIN = { top: 560, bottom: 560, left: 900, right: 900 };
const NO_BORDER = {
  top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
};
const THIN = (color = C.border) => ({ style: BorderStyle.SINGLE, size: 4, color });

// ── Primitives ────────────────────────────────────────────────────────────

function r(text, o = {}) {
  return new TextRun({
    text: text ?? '',
    bold: o.bold,
    italics: o.italic,
    size: (o.size || 9) * 2,
    color: o.color || C.darkGray,
    font: 'Calibri',
    underline: o.underline ? { type: UnderlineType.SINGLE } : undefined,
  });
}

function p(children, o = {}) {
  const runs = Array.isArray(children) ? children : [children];
  return new Paragraph({
    alignment: o.align === 'center' ? AlignmentType.CENTER
             : o.align === 'right'  ? AlignmentType.RIGHT
             : AlignmentType.LEFT,
    spacing: {
      before: (o.before || 0) * 20,
      after:  (o.after  || 0) * 20,
    },
    children: runs,
    border: o.bottomLine ? {
      bottom: { color: C.brand, space: 3, style: BorderStyle.SINGLE, size: 8 }
    } : undefined,
  });
}

function tc(children, o = {}) {
  const arr = Array.isArray(children) ? children : [children];
  return new TableCell({
    children: arr,
    shading: o.bg ? { fill: o.bg, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    verticalAlign: VerticalAlign.TOP,
    width: o.pct != null ? { size: o.pct, type: WidthType.PERCENTAGE }
         : o.twip != null ? { size: o.twip, type: WidthType.DXA }
         : undefined,
    margins: { top: 50, bottom: 50, left: 100, right: 100 },
    columnSpan: o.span,
    borders: o.noBorder ? NO_BORDER
           : o.borders  ? o.borders
           : undefined,
  });
}

function hdrRow(labels, pcts) {
  return new TableRow({
    tableHeader: true,
    children: labels.map((lbl, i) =>
      tc(p(r(lbl, { bold: true, size: 8, color: C.white }), { align: 'center' }),
         { bg: C.brand, pct: pcts ? pcts[i] : undefined })
    ),
  });
}

function secHead(num, title) {
  return p([
    r(`${num}.  `, { bold: true, size: 11, color: C.brand }),
    r(title,       { bold: true, size: 11, color: C.navy }),
  ], { before: 4, after: 3, bottomLine: true });
}

// ── Screenshot ────────────────────────────────────────────────────────────

function getScreenshot(runId, scenarioId, stepIndex) {
  for (const ext of ['png', 'jpg']) {
    const fp = path.join(SCREENSHOTS_PATH, runId, scenarioId, `step_${stepIndex}.${ext}`);
    if (fs.existsSync(fp)) return { data: fs.readFileSync(fp), type: ext };
  }
  return null;
}

// Returns an extra TableRow to splice in after the step row — contains the screenshot
function screenshotRow(img, figNum, stepLabel, colCount) {
  if (!img) return null;
  const W = 460, H = Math.round(W * 0.5625);
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: colCount,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 0 },
            children: [new ImageRun({ data: img.data, transformation: { width: W, height: H }, type: img.type })],
          }),
          p([ r(`Figure ${figNum}: `, { bold: true, size: 7.5, color: C.midGray }),
              r(stepLabel, { italic: true, size: 7.5, color: C.midGray }) ],
            { align: 'center', before: 1, after: 3 }),
        ],
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: THIN(),
          left: THIN(),
          right: THIN(),
        },
        shading: { fill: C.lightGray, type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
      }),
    ],
  });
}

// ── Header / Footer ──────────────────────────────────────────────────────

function makeHeader(instanceId) {
  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE }, insideH: { style: BorderStyle.NONE },
          insideV: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: C.brand },
        },
        rows: [new TableRow({ children: [
          tc(p(r('Assure', { bold: true, size: 9, color: C.brand })), { pct: 30, noBorder: true }),
          tc(p(r('Evidence of Testing  —  CONFIDENTIAL', { size: 7.5, color: C.midGray, italic: true }), { align: 'center' }), { pct: 40, noBorder: true }),
          tc(p([
            r(`${instanceId}  |  Page `, { size: 7.5, color: C.midGray }),
            new TextRun({ children: [PageNumber.CURRENT], size: 15, color: C.midGray, font: 'Calibri' }),
            r(' of ', { size: 7.5, color: C.midGray }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: C.midGray, font: 'Calibri' }),
          ], { align: 'right' }), { pct: 30, noBorder: true }),
        ]})],
      }),
    ],
  });
}

function makeFooter(runId, dateStr) {
  return new Footer({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE }, insideH: { style: BorderStyle.NONE },
          insideV: { style: BorderStyle.NONE },
          top: { style: BorderStyle.SINGLE, size: 4, color: C.border },
        },
        rows: [new TableRow({ children: [
          tc(p(r(`Run: ${runId}`, { size: 7, color: C.midGray, italic: true })), { pct: 45, noBorder: true }),
          tc(p(r(`Generated by Assure  ·  ${dateStr}  ·  Oracle Transportation Management`, { size: 7, color: C.midGray, italic: true }), { align: 'right' }), { pct: 55, noBorder: true }),
        ]})],
      }),
    ],
  });
}

// ── Main ─────────────────────────────────────────────────────────────────

async function generateEvidenceDoc(runId) {
  const run_ = db.prepare('SELECT * FROM runs WHERE id=?').get(runId);
  if (!run_) throw new Error('Run not found');

  const results  = db.prepare('SELECT * FROM run_results WHERE run_id=? ORDER BY scenario_id').all(runId);
  const steps    = db.prepare('SELECT * FROM run_steps WHERE run_id=? ORDER BY scenario_id, step_index').all(runId);
  const scIds    = [...new Set(results.map(r => r.scenario_id))];
  const scenarios = scIds.length
    ? db.prepare(`SELECT * FROM scenarios WHERE id IN (${scIds.map(() => '?').join(',')})`).all(...scIds)
    : [];
  const scMap    = Object.fromEntries(scenarios.map(s => [s.id, s]));
  const scSteps  = scIds.length
    ? db.prepare(`SELECT * FROM scenario_steps WHERE scenario_id IN (${scIds.map(() => '?').join(',')})`).all(...scIds)
    : [];
  const expMap = {};
  for (const s of scSteps) {
    if (!expMap[s.scenario_id]) expMap[s.scenario_id] = {};
    expMap[s.scenario_id][s.step_index] = s.expected;
  }

  const totalPassed = results.filter(r => r.status === 'pass').length;
  const totalFailed = results.filter(r => r.status === 'fail').length;
  const pct         = results.length ? Math.round(totalPassed / results.length * 100) : 0;
  const verdict     = pct === 100 ? 'READY FOR GO-LIVE' : pct >= 80 ? 'CONDITIONAL PASS' : 'NOT READY';
  const verdictColor= pct === 100 ? C.green : pct >= 80 ? C.amber : C.red;
  const dateStr     = new Date(run_.created_at).toLocaleString('en-GB', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const shortDate   = new Date(run_.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const dur         = run_.duration_ms ? `${Math.floor(run_.duration_ms/60000)}m ${Math.floor((run_.duration_ms%60000)/1000)}s` : '—';

  const header = makeHeader(run_.instance_id);
  const footer = makeFooter(runId, dateStr);

  // ── COVER PAGE ────────────────────────────────────────────────────────────
  const cover = [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [new TableCell({
        children: [
          p(r('Assure', { bold: true, size: 30, color: C.white }), { align: 'center', before: 6, after: 2 }),
          p(r('Oracle Transportation Management', { size: 12, color: C.brandLight }), { align: 'center', after: 6 }),
        ],
        shading: { fill: C.brand, type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 220, bottom: 220, left: 300, right: 300 },
        borders: NO_BORDER,
      })]})],
    }),
    p(r(''), { before: 6 }),
    p(r('EVIDENCE OF TESTING', { bold: true, size: 20, color: C.navy }), { align: 'center', before: 2, after: 1 }),
    p(r('Automated Test Execution Report', { size: 11, color: C.midGray, italic: true }), { align: 'center', after: 8 }),

    new Table({
      width: { size: 45, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: [new TableRow({ children: [new TableCell({
        children: [
          p(r(verdict, { bold: true, size: 14, color: C.white }), { align: 'center', before: 3, after: 1 }),
          p(r(`${pct}%  Pass Rate  ·  ${totalPassed}/${results.length} Scenarios`, { size: 9, color: C.white }), { align: 'center', after: 3 }),
        ],
        shading: { fill: verdictColor, type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 120, bottom: 120, left: 180, right: 180 },
        borders: NO_BORDER,
      })]})],
    }),
    p(r(''), { before: 8 }),

    new Table({
      width: { size: 65, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      rows: [
        ['Document Reference', runId],
        ['OTM Instance',       run_.instance_id],
        ['Execution Date',     dateStr],
        ['Duration',           dur],
        ['Executed By',        run_.triggered_by || 'Admin'],
        ['Scenarios',          `${results.length} total  (${totalPassed} passed, ${totalFailed} failed)`],
      ].map(([label, value]) => new TableRow({ children: [
        tc(p(r(label, { bold: true, size: 9, color: C.white })), { bg: C.navy, pct: 38 }),
        tc(p(r(value, { size: 9 })), { pct: 62 }),
      ]})),
    }),

    p(r(''), { before: 14 }),
    p(r('CONFIDENTIAL  —  For authorised recipients only  —  Do not distribute', { size: 8, color: C.midGray, italic: true }), { align: 'center' }),
    p(r(`Prepared by Assure  ·  ${shortDate}`, { size: 8, color: C.midGray, italic: true }), { align: 'center', before: 1 }),
  ];

  // ── EXECUTIVE SUMMARY ────────────────────────────────────────────────────
  const summary = [
    secHead(1, 'EXECUTIVE SUMMARY'),
    p(r(`Automated test execution performed on OTM instance ${run_.instance_id} on ${dateStr}. ${results.length} scenario(s) executed.`, { size: 9 }), { before: 3, after: 4 }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [new TableCell({
        children: [p([
          r('Overall Verdict:  ', { size: 10, color: C.white }),
          r(verdict, { bold: true, size: 12, color: C.white }),
          r(`   ·   ${pct}% pass rate  ·  ${totalPassed}/${results.length} scenarios  ·  Duration: ${dur}`, { size: 9, color: C.white }),
        ], { before: 2, after: 2 })],
        shading: { fill: verdictColor, type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 80, bottom: 80, left: 150, right: 150 },
        borders: NO_BORDER,
      })]})],
    }),

    p(r('Scenario Summary', { bold: true, size: 10, color: C.navy }), { before: 6, after: 3 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        hdrRow(['#', 'Scenario ID', 'Scenario Name', 'Category', 'Duration', 'Result'], [4, 10, 44, 13, 11, 18]),
        ...results.map((res, idx) => {
          const sc = scMap[res.scenario_id];
          const d  = res.duration_ms ? `${Math.floor(res.duration_ms/60000)}m ${Math.floor((res.duration_ms%60000)/1000)}s` : '—';
          const ok = res.status === 'pass';
          const bg = idx % 2 === 0 ? C.white : C.lightGray;
          return new TableRow({ children: [
            tc(p(r(`${idx+1}`, { size: 8, color: C.midGray }), { align: 'center' }), { bg }),
            tc(p(r(res.scenario_id, { bold: true, size: 8, color: C.brand })), { bg }),
            tc(p(r(sc?.name || res.scenario_id, { size: 8 })), { bg }),
            tc(p(r(sc?.category || '—', { size: 8 }), { align: 'center' }), { bg }),
            tc(p(r(d, { size: 8 }), { align: 'center' }), { bg }),
            tc(p(r(ok ? '✔  PASS' : '✖  FAIL', { bold: true, size: 8, color: ok ? C.greenText : C.red }), { align: 'center' }), { bg: ok ? C.greenBg : C.redBg }),
          ]});
        }),
      ],
    }),
  ];

  // ── PER-SCENARIO SECTIONS ─────────────────────────────────────────────────
  const scenarioSections = [];
  let figNum = 1;

  for (let si = 0; si < results.length; si++) {
    const res  = results[si];
    const sc   = scMap[res.scenario_id];
    const scSt = steps.filter(s => s.scenario_id === res.scenario_id);
    const ok   = res.status === 'pass';
    const d    = res.duration_ms ? `${Math.floor(res.duration_ms/60000)}m ${Math.floor((res.duration_ms%60000)/1000)}s` : '—';

    const metaTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [
        tc([ p(r('Category', { size: 7.5, color: C.midGray, bold: true }), { after: 1 }), p(r(sc?.category || '—', { size: 9 })) ], { pct: 20, bg: C.lightGray }),
        tc([ p(r('Duration', { size: 7.5, color: C.midGray, bold: true }), { after: 1 }), p(r(d, { size: 9 })) ], { pct: 18, bg: C.lightGray }),
        tc([ p(r('Executed', { size: 7.5, color: C.midGray, bold: true }), { after: 1 }), p(r(dateStr, { size: 9 })) ], { pct: 42, bg: C.lightGray }),
        tc([ p(r('Result', { size: 7.5, color: C.midGray, bold: true }), { after: 1 }),
             p(r(ok ? '✔  PASS' : '✖  FAIL', { bold: true, size: 10, color: ok ? C.green : C.red })) ],
           { pct: 20, bg: ok ? C.greenBg : C.redBg }),
      ]}),
      ],
    });

    const COL_COUNT = 5;
    const stepRows = [];
    for (const s of scSt) {
      const pass = s.status === 'pass';
      const fail = s.status === 'fail';
      const exp  = s.expected || expMap[s.scenario_id]?.[s.step_index] || '—';
      const act  = s.actual || (fail ? s.error || 'Step did not complete' : pass ? 'Completed as expected' : '—');
      const lbl  = pass ? '✔ Pass' : fail ? '✖ Fail' : '— Skip';
      const clr  = pass ? C.greenText : fail ? C.red : C.midGray;
      const rowBg= s.step_index % 2 === 0 ? C.white : C.lightGray;

      stepRows.push(new TableRow({ children: [
        tc(p(r(`${s.step_index + 1}`, { size: 8, color: C.midGray }), { align: 'center' }), { bg: rowBg, pct: 4 }),
        tc(p(r(s.step_name, { bold: true, size: 8 })), { bg: rowBg, pct: 18 }),
        tc(p(r(exp, { size: 8, color: C.midGray, italic: true })), { bg: rowBg, pct: 33 }),
        tc(p(r(act, { size: 8, color: fail ? C.red : C.darkGray })), { bg: fail ? C.redBg : rowBg, pct: 33 }),
        tc(p(r(lbl, { bold: true, size: 8, color: clr }), { align: 'center' }), { bg: pass ? C.greenBg : fail ? C.redBg : rowBg, pct: 12 }),
      ]}));

      const img  = getScreenshot(runId, res.scenario_id, s.step_index);
      const sRow = screenshotRow(img, figNum++, `Step ${s.step_index + 1} — ${s.step_name}`, COL_COUNT);
      if (sRow) stepRows.push(sRow);
    }

    const stepsTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        hdrRow(['#', 'Step', 'Expected Outcome', 'Actual Result', 'Status'], [4, 18, 33, 33, 12]),
        ...stepRows,
      ],
    });

    const failStep = scSt.find(s => s.status === 'fail');
    const failBlock = (!ok && failStep?.error) ? [
      p(r('Error Detail', { bold: true, size: 9, color: C.red }), { before: 4, after: 2 }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: [
          tc(p(r(failStep.error, { size: 8, color: C.red })), { bg: C.redBg }),
        ]})],
      }),
    ] : [];

    scenarioSections.push({
      properties: { page: { margin: MARGIN } },
      headers: { default: header },
      footers: { default: footer },
      children: [
        secHead(si + 2, `${res.scenario_id}  —  ${sc?.name || res.scenario_id}`),
        metaTable,
        p(r('Test Step Evidence', { bold: true, size: 10, color: C.navy }), { before: 5, after: 3 }),
        stepsTable,
        ...failBlock,
      ],
    });
  }

  // ── SIGN-OFF PAGE ─────────────────────────────────────────────────────────
  const signoff = [
    secHead(results.length + 2, 'SIGN-OFF AND APPROVAL'),
    p(r(`This document certifies that the scenarios listed above were executed against Oracle Transportation Management instance ${run_.instance_id} and the results are accurate and complete.`, { size: 9 }), { before: 3, after: 6 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        hdrRow(['Role', 'Full Name', 'Signature', 'Date'], [22, 24, 34, 20]),
        ...['Test Lead', 'Business Analyst', 'OTM Consultant', 'Project Manager', 'Client Authorised Signatory'].map((role, i) =>
          new TableRow({ children: [
            tc(p(r(role, { size: 9 })), { bg: i % 2 === 0 ? C.white : C.lightGray }),
            tc(p(r('', { size: 9 })), { bg: i % 2 === 0 ? C.white : C.lightGray }),
            tc(p(r('', { size: 9 })), { bg: i % 2 === 0 ? C.white : C.lightGray }),
            tc(p(r('', { size: 9 })), { bg: i % 2 === 0 ? C.white : C.lightGray }),
          ]})
        ),
      ],
    }),
    p(r(''), { before: 8 }),
    p(r('CONFIDENTIAL  —  Oracle Transportation Management Upgrade Testing', { size: 8, color: C.midGray, italic: true }), { align: 'center' }),
    p(r(`Generated by Assure  ·  ${dateStr}  ·  Run ${runId}`, { size: 8, color: C.midGray, italic: true }), { align: 'center', before: 1 }),
  ];

  const doc = new Document({
    creator: 'Assure',
    title: `Evidence of Testing — ${runId}`,
    styles: { default: { document: { run: { font: 'Calibri', size: 18, color: C.darkGray } } } },
    sections: [
      { properties: { page: { margin: MARGIN } }, children: cover },
      { properties: { page: { margin: MARGIN } }, headers: { default: header }, footers: { default: footer }, children: summary },
      ...scenarioSections,
      { properties: { page: { margin: MARGIN } }, headers: { default: header }, footers: { default: footer }, children: signoff },
    ],
  });

  return Packer.toBuffer(doc);
}

module.exports = { generateEvidenceDoc };
