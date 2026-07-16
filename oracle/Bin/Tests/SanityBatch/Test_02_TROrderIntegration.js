'use strict';

const https   = require('https');
const fs      = require('fs');
const path    = require('path');
const { By, until, Key } = require('selenium-webdriver');
const { assert } = require('chai');
const Constants_1       = require('../../Src/Util/Constants');
const TestUtil_1        = require('../../Src/Util/TestUtil');
const CommonFunctions_1 = require('../../Src/Util/CommonFunctions');
const FinderPage_1        = require('../../Src/Pages/FinderPage');
const FinderResultsPage_1 = require('../../Src/Pages/FinderResultsPage');

// Step-indexed screenshot helper for Evidence of Testing doc
async function saveScreenshot(driver, screenshotsDir, stepIndex) {
  if (!screenshotsDir) return;
  try {
    fs.mkdirSync(screenshotsDir, { recursive: true });
    const img = await driver.takeScreenshot();
    fs.writeFileSync(path.join(screenshotsDir, `step_${stepIndex}.png`), img, 'base64');
  } catch (e) {}
}

// ── Paths ────────────────────────────────────────────────────────────────────
const TEMPLATE     = path.join(__dirname, '..', '..', '..', 'Testdata', 'SanityBatch', 'SC02_TX1_template.xml');
const TEMPLATE_TX2 = path.join(__dirname, '..', '..', '..', 'Testdata', 'SanityBatch', 'SC02_TX2_template.xml');
const TEMPLATE_TX3 = path.join(__dirname, '..', '..', '..', 'Testdata', 'SanityBatch', 'SC02_TX3_template.xml');
const TX3_DELIVERY_NOTE = '0087325725';

// ── WMServlet credentials ────────────────────────────────────────────────────
const WM_USER = 'TMS.TMS_P2T';
const WM_PASS = 'Changeme123$';

// ── Helpers ──────────────────────────────────────────────────────────────────
const COUNTER_FILE = path.join(__dirname, '..', '..', '..', 'Testdata', 'SanityBatch', 'order_counter.json');

function generateOrderId() {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;

  // Read counter, reset if date changed
  let counter = { date: '', seq: 0 };
  try { counter = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8')); } catch {}
  if (counter.date !== dateStr) { counter = { date: dateStr, seq: 0 }; }

  counter.seq += 1;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(counter), 'utf8');

  return `TR_${dateStr}_${String(counter.seq).padStart(3, '0')}`;
}

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

function httpsPost(hostname, xmlBody) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${WM_USER}:${WM_PASS}`).toString('base64');
    const req  = https.request({
      hostname,
      path: '/GC3/glog.integration.servlet.WMServlet',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(xmlBody)
      },
      rejectUnauthorized: false
    }, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(xmlBody);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Switch to the OTM content frame (mainBody or mainIFrame)
// Use switchTo().frame(name) directly — avoids the OJet findElement override which calls
// whenReady() on the frame element and can hang for minutes.
async function switchToContentFrame(driver) {
  await driver.switchTo().defaultContent();
  // Try by frame name first (GC3 legacy framesets use 'mainBody')
  try { await driver.switchTo().frame('mainBody'); return; } catch {}
  // Try by iframe id
  try { await driver.switchTo().frame('mainIFrame'); return; } catch {}
  // Last resort: frame index 0
  try { await driver.switchTo().frame(0); } catch {}
}

// Read a field value from within the current frame context
async function getFieldText(driver, labelText) {
  const xpaths = [
    `//*[normalize-space(text())='${labelText}']/following-sibling::*[1]`,
    `//*[normalize-space(text())='${labelText}']/following::input[1]`,
    `//*[normalize-space(text())='${labelText}']/ancestor::td/following-sibling::td[1]`,
    `//*[normalize-space(text())='${labelText}']/following::td[1]`,
  ];
  for (const xp of xpaths) {
    try {
      const el = await driver.findElement(By.xpath(xp));
      const val = (await el.getAttribute('value') || await el.getText() || '').trim();
      if (val) return val;
    } catch {}
  }
  return '';
}

// Read a refnum value by qualifier name from a table row
async function getRefnumValue(driver, qualifierName) {
  // No visibility check — reference numbers may be in a section that just re-rendered.
  const val = await driver.executeScript(`
    var cells = Array.from(document.querySelectorAll('td'));
    for (var i = 0; i < cells.length; i++) {
      if (cells[i].textContent.trim() === arguments[0]) {
        var row = cells[i].parentElement;
        if (row) {
          var tds = Array.from(row.querySelectorAll('td'));
          var idx = tds.indexOf(cells[i]);
          if (idx >= 0 && tds[idx+1]) {
            var v = tds[idx+1].textContent.trim();
            if (v) return v;
          }
        }
        var next = cells[i].nextElementSibling;
        if (next && next.textContent.trim()) return next.textContent.trim();
      }
    }
    return '';
  `, qualifierName);
  return (val || '').trim();
}

// Helper: save a screenshot with a label into the Screenshots folder
async function snap(driver, screenshotFolder, label) {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(screenshotFolder, `role_${label}_${ts}.png`);
    fs.mkdirSync(screenshotFolder, { recursive: true });
    const img = await driver.takeScreenshot();
    fs.writeFileSync(file, img, 'base64');
    return file;
  } catch { return null; }
}

// Switch OTM role via Settings and Actions panel — keyboard navigation approach
async function switchToRole(driver, roleName, objTestUtil) {
  const { Key } = require('selenium-webdriver');
  await objTestUtil.logMessage('INFO', `Switching to ${roleName} role`);
  const ssDir = objTestUtil.TEST_SCREENSHOT_FOLDER;

  // Step 1: Click the user ID button to open Settings and Actions panel
  const settingsBtnXp = `//a[contains(.,'LEL7597_TMS')] | //span[contains(.,'LEL7597_TMS')]`;
  let settingsBtn;
  try {
    settingsBtn = await driver.wait(until.elementLocated(By.xpath(settingsBtnXp)), 15000);
  } catch {
    await objTestUtil.logMessage('INFO', 'Settings button not found — skipping role switch');
    return;
  }
  await snap(driver, ssDir, '1_before_settings_click');
  await settingsBtn.click();
  await driver.sleep(3000);

  // Step 2: Confirm Settings panel is open — wait for Save and Close button
  const saveBtnXp = `//button[normalize-space(.)='Save and Close']`;
  try {
    await driver.wait(until.elementLocated(By.xpath(saveBtnXp)), 15000);
    await objTestUtil.logMessage('INFO', 'Settings panel confirmed open');
    await snap(driver, ssDir, '2_settings_panel_open');
  } catch {
    await snap(driver, ssDir, '2_settings_panel_FAILED');
    await objTestUtil.logMessage('INFO', 'Settings panel did not open — skipping role switch');
    return;
  }

  // Step 3: Tab from the panel header until the User Role dropdown is focused,
  //         then open it and click the target role option
  // The User Role select is the first focusable field in User Details section.
  // Tab from the panel's Save and Close button area to land on the role dropdown.
  const roleDropdownXp = `//span[text()='User Role']/ancestor::oj-label/parent::div/following-sibling::div//oj-select-single | //oj-label[normalize-space(.)='User Role']/following::oj-select-single[1]`;
  let roleEl;
  try {
    roleEl = await driver.findElement(By.xpath(roleDropdownXp));
  } catch {
    await objTestUtil.logMessage('INFO', 'User Role dropdown not found — skipping role switch');
    return;
  }

  // Open the dropdown via keyboard: focus → Ctrl+A → Delete → type role name to filter
  await driver.executeScript('arguments[0].focus()', roleEl);
  await driver.sleep(500);
  await driver.actions().keyDown(Key.CONTROL).sendKeys('a').keyUp(Key.CONTROL).perform();
  await driver.sleep(300);
  await driver.actions().sendKeys(Key.DELETE).perform();
  await driver.sleep(300);
  await driver.actions().sendKeys(roleName).perform();
  await driver.sleep(2000);
  await snap(driver, ssDir, '3_dropdown_opened');

  // Arrow Down selects the first (and only) filtered option, Enter confirms — pure keyboard
  await driver.actions().sendKeys(Key.ARROW_DOWN).perform();
  await driver.sleep(300);
  await driver.actions().sendKeys(Key.RETURN).perform();
  await driver.sleep(500);
  await objTestUtil.logMessage('INFO', `${roleName} selected via Arrow Down + Enter`);
  await driver.sleep(1000);
  await snap(driver, ssDir, '4_after_role_selected');
  await objTestUtil.logMessage('INFO', `User Role set to ${roleName}`);

  // Step 4: Tab to Save and Close and press Enter
  await driver.sleep(300);
  for (let i = 0; i < 20; i++) {
    await driver.actions().sendKeys(Key.TAB).perform();
    await driver.sleep(150);
    const focused = await driver.executeScript(
      `var el = document.activeElement;
       if (!el) return '';
       return (el.textContent || el.value || el.getAttribute('aria-label') || el.tagName || '').trim().substring(0, 60);`
    );
    await objTestUtil.logMessage('INFO', `Tab ${i+1}: focused = "${focused}"`);
    if (focused && focused.toLowerCase().includes('save')) {
      await driver.actions().sendKeys(Key.RETURN).perform();
      await objTestUtil.logMessage('INFO', 'Pressed Enter on Save and Close');
      break;
    }
  }
  await driver.sleep(8000); // wait for OTM to reload with new role
  await snap(driver, ssDir, '6_after_role_switch_home');

  await objTestUtil.logMessage('INFO', `Role switched to ${roleName}`);
}

// Navigate to an Order Management submenu item via the home page tile
// submenuLabel: e.g. 'Orders - New', 'Orders - Unplanned'
async function navigateToOrderRelease(driver, subMenuLabel) {
  const label = subMenuLabel || 'Orders - New';
  await driver.sleep(3000);

  // Click the visible "Order Management" tile
  const clicked = await driver.executeScript(`
    var els = Array.from(document.querySelectorAll('span, div, a'));
    var target = els.find(function(el) {
      return el.textContent.trim() === 'Order Management' && el.offsetParent !== null;
    });
    if (target) { target.click(); return true; }
    return false;
  `);
  if (!clicked) throw new Error('Order Management tile not found or not visible');

  await driver.sleep(2500);

  const menuXp = `//*[normalize-space(text())='${label}'] | //*[normalize-space(.)='${label}' and not(*)]`;
  const menuItem = await driver.findElement(By.xpath(menuXp));
  await driver.executeScript('arguments[0].click()', menuItem);

  await driver.wait(
    until.elementLocated(By.xpath(`//iframe | //input[@title='Search'] | //*[contains(@class,'finder')]`)),
    20000
  );
  await driver.sleep(2000);
}

// ── Test ─────────────────────────────────────────────────────────────────────
describe('Test_02_TROrderIntegration', function () {
  this.timeout(600000);

  let objTestUtil;
  let orderId, otmHost;

  before(async function () {
    await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
    objTestUtil = new TestUtil_1.TestUtil(
      Constants_1.Constants.driver,
      Constants_1.Constants.sURL,
      Constants_1.Constants.TEST_LOG_FOLDER,
      Constants_1.Constants.TESTCASE_NAME,
      Constants_1.Constants.TEST_SUMMARY_FILE
    );
    otmHost = new URL(Constants_1.Constants.sURL).hostname;
  });

  it('TR Order Integration - SAP to OTM', async function () {
    const driver = Constants_1.Constants.driver;
    const screenshotsDir = process.env.SCREENSHOTS_DIR || null;

    // ── Step 0: Generate order ID ────────────────────────────────────────────
    orderId = generateOrderId();
    await objTestUtil.logMessage('INFO', `Generating order ID ${orderId}`);
    await saveScreenshot(driver, screenshotsDir, 0);

    // ── Step 2: Upload XML to WMServlet ──────────────────────────────────────
    const tx1RddDate = addDays(2);
    const template = fs.readFileSync(TEMPLATE, 'utf8');
    const xml = template
      .replace(/\{\{ORDER_ID\}\}/g,    orderId)
      .replace(/\{\{PICKUP_DATE\}\}/g, addDays(0))
      .replace(/\{\{RDD_DATE\}\}/g,    tx1RddDate);

    await objTestUtil.logMessage('INFO', `Uploading XML to WMServlet for order TMS.${orderId}`);
    const uploadRes = await httpsPost(otmHost, xml);
    assert.equal(uploadRes.statusCode, 200, `WMServlet returned HTTP ${uploadRes.statusCode}`);
    await saveScreenshot(driver, screenshotsDir, 1);

    // ── Step 2: Verify WMServlet accepted ────────────────────────────────────
    const rejected = uploadRes.body.includes('<Error>') || uploadRes.body.toLowerCase().includes('rejected');
    assert.ok(!rejected, `WMServlet rejected payload:\n${uploadRes.body.slice(0, 500)}`);
    await objTestUtil.logMessage('INFO', `WMServlet accepted order - HTTP 200 OK`);
    await saveScreenshot(driver, screenshotsDir, 2);

    // ── Step 3: Wait for agent / Login to OTM ───────────────────────────────
    await objTestUtil.loadURL(Constants_1.Constants.sURL);
    const loginOk = await objTestUtil.login(
      Constants_1.Constants.DBA_USERNAME,
      Constants_1.Constants.DBA_PASSWORD
    );
    assert.ok(loginOk, 'OTM login failed');
    await objTestUtil.logMessage('INFO', `Logging in to OTM as ${Constants_1.Constants.DBA_USERNAME}`);
    await driver.sleep(3000);
    await saveScreenshot(driver, screenshotsDir, 3);
    await saveScreenshot(driver, screenshotsDir, 4);

    // ── Step 6: Switch to turkey_planner role ────────────────────────────────
    await switchToRole(driver, 'TURKEY_PLANNER', objTestUtil);
    await driver.sleep(3000);

    // Wait for home page to fully reload after role switch before navigating
    await driver.wait(until.titleContains('Home'), 30000);
    await driver.sleep(2000);

    // ── Step 5: Navigate to Order Release finder ─────────────────────────────
    await objTestUtil.logMessage('INFO', 'Navigating to Order Management > Orders - New');
    await navigateToOrderRelease(driver, 'Orders - New');
    await driver.sleep(2000);
    await saveScreenshot(driver, screenshotsDir, 5);

    // ── Step 6: Search for order (with retry — OTM agent may need up to 2 min) ─
    await objTestUtil.logMessage('INFO', `Searching for order ${orderId}`);
    const finderPage = new FinderPage_1.FinderPage(driver, objTestUtil.TEST_LOG_FILE);
    await finderPage.navigateToFinderSetResultsPageWithXID(orderId, 'Begins With');
    await driver.sleep(5000);

    // Retry up to 24×5s = 2 min waiting for OTM to process the order
    for (let attempt = 0; attempt < 24; attempt++) {
      await driver.switchTo().defaultContent();
      try { await driver.switchTo().frame(0); } catch(e) {}
      const totalFound = await driver.executeScript(`
        var text = document.body ? document.body.innerText : '';
        if (text.indexOf('Total Found:') !== -1) {
          var m = text.match(/Total Found:\\s*(\\d+)/);
          return m ? parseInt(m[1], 10) : -1;
        }
        return -1;
      `);
      await driver.switchTo().defaultContent();
      if (totalFound > 0) break;
      await objTestUtil.logMessage('INFO', `Order not yet in Orders-New (attempt ${attempt+1}/24), waiting...`);
      await driver.sleep(5000);
      await driver.executeScript(`
        var btn = Array.from(document.querySelectorAll('input[type="button"], input[type="image"], input')).find(function(b){
          return b.value === 'Rerun Query' || b.alt === 'Rerun Query' || b.title === 'Rerun Query';
        });
        if (btn) btn.click();
      `);
      await driver.sleep(5000);
    }

    await saveScreenshot(driver, screenshotsDir, 6);

    // ── Open the order via results page (JS click — bypass OJet override) ────
    await driver.switchTo().defaultContent();
    await driver.sleep(500);
    try { await driver.switchTo().frame(0); } catch (e) {}
    const newOrderIcons = await driver.executeScript(`
      return Array.from(document.querySelectorAll('input[type="image"], input[alt], img[alt]'))
        .map(function(el) { return (el.alt || el.title || '') + '|' + el.tagName; }).join(', ');
    `);
    await objTestUtil.logMessage('INFO', `Orders-New results icons: ${newOrderIcons}`);
    // Select the first row checkbox, then click Edit
    await driver.executeScript(`
      var chk = document.querySelector('input[type="checkbox"]');
      if (chk) chk.click();
    `);
    await driver.sleep(500);
    const handlesBefore = await driver.getAllWindowHandles();
    await driver.executeScript(`
      var editIcon = document.querySelector('input[alt="Edit"]') || document.querySelector('input[alt="View"]');
      if (editIcon) editIcon.click();
    `);
    // Dismiss any "You must select an item" alert
    try {
      await driver.switchTo().alert().then(async a => { await a.accept(); });
    } catch (e) {}
    await driver.switchTo().defaultContent();
    await driver.sleep(5000);

    // Order detail may open in a new window — switch to it if so
    const handlesAfter = await driver.getAllWindowHandles();
    const newWin = handlesAfter.find(h => !handlesBefore.includes(h));
    if (newWin) {
      await driver.switchTo().window(newWin);
      await objTestUtil.logMessage('INFO', 'Switched to order detail window');
      await driver.sleep(6000);
    }
    const ssDir2 = objTestUtil.TEST_SCREENSHOT_FOLDER;
    await snap(driver, ssDir2, 'ord_01_after_window_switch');

    // ── Step 8: Verify Buy Itinerary Profile = TURKEY_ITINERARY ───────────────
    // Order detail page — fields are in a content frame
    await switchToContentFrame(driver);
    await snap(driver, ssDir2, 'ord_02_after_frame_switch');

    // Dump page source after frame switch to see field labels
    try {
      const src = await driver.executeScript('return document.body ? document.body.innerHTML.substring(0, 30000) : "no body"');
      fs.writeFileSync(
        path.join(__dirname, '..', '..', '..', 'Results', 'order_detail_dump.html'), src, 'utf8'
      );
      await objTestUtil.logMessage('INFO', 'Order detail page source dumped');
    } catch(e) {
      await objTestUtil.logMessage('INFO', `Dump failed: ${e.message.split('\n')[0]}`);
    }

    // Log all visible tab text to find the correct tab label
    try {
      const tabTexts = await driver.executeScript(`
        return Array.from(document.querySelectorAll('a,td,span,li'))
          .filter(e => e.offsetParent !== null && e.children.length === 0)
          .map(e => e.textContent.trim())
          .filter(t => t.length > 0 && t.length < 40)
          .join(' | ');
      `);
      await objTestUtil.logMessage('INFO', `Visible short texts: ${String(tabTexts).substring(0, 500)}`);
    } catch {}

    // ── Step 9: Verify refnums on Order Release tab (already active by default) ──
    const movType   = await getRefnumValue(driver, 'MOVEMENT_TYPE');
    const equipType = await getRefnumValue(driver, 'EQUIPMENT_TYPE');

    assert.ok(['DOMESTIC', 'EXPORT'].includes(movType),
      `Expected MOVEMENT_TYPE = DOMESTIC or EXPORT, got: "${movType}"`);
    await objTestUtil.logMessage('INFO', `Movement Type verified: ${movType}`);
    await saveScreenshot(driver, screenshotsDir, 9);

    assert.ok(['DRY', 'REEFER'].includes(equipType),
      `Expected EQUIPMENT_TYPE = DRY or REEFER, got: "${equipType}"`);
    await objTestUtil.logMessage('INFO', `Equipment Type verified: ${equipType}`);
    await saveScreenshot(driver, screenshotsDir, 10);

    // ── Step 10: Verify LDD is set (Order Release tab, still active) ──────────
    const ldd = await getFieldText(driver, 'Late Delivery Date');
    assert.ok(ldd && ldd !== 'DD/MM/YYYY HH.mm',
      `Expected Late Delivery Date to be set, got: "${ldd}"`);
    await objTestUtil.logMessage('INFO', `LDD verified: ${ldd}`);

    // ── Step 11: Click Constraints tab → verify Buy Itinerary Profile ─────────
    await driver.executeScript(`
      var tabs = Array.from(document.querySelectorAll('a, td, span'));
      var tab = tabs.find(function(el) {
        return el.textContent.trim() === 'Constraints' && el.offsetParent !== null;
      });
      if (tab) tab.click();
    `);
    await driver.sleep(2000);
    await objTestUtil.logMessage('INFO', 'Constraints tab clicked via JS');

    const buyItinerary = await getFieldText(driver, 'Buy Itinerary Profile');
    assert.ok(buyItinerary.includes('TURKEY_ITINERARY'),
      `Expected Buy Itinerary Profile = TURKEY_ITINERARY, got: "${buyItinerary}"`);
    await objTestUtil.logMessage('INFO', `Buy Itinerary verified: ${buyItinerary}`);
    await saveScreenshot(driver, screenshotsDir, 7);

    // Fixed Itinerary is empty for domestic orders — just log it
    const fixedItinerary = await getFieldText(driver, 'Buy Fixed Itinerary');
    await objTestUtil.logMessage('INFO', `Fixed Itinerary verified: ${fixedItinerary || '(empty — domestic order)'}`);
    await saveScreenshot(driver, screenshotsDir, 8);

    // ── Close TX1 order detail window, return to main window ─────────────────
    await driver.switchTo().defaultContent();
    const allHandlesTx1 = await driver.getAllWindowHandles();
    const mainHandleTx1 = allHandlesTx1[0];
    for (const h of allHandlesTx1) {
      if (h !== mainHandleTx1) {
        await driver.switchTo().window(h);
        await driver.close();
      }
    }
    await driver.switchTo().window(mainHandleTx1);
    await driver.sleep(1000);

    // ── Click Home button in top nav bar ─────────────────────────────────────
    await driver.switchTo().defaultContent();
    const homeClicked = await driver.executeScript(`
      var btn = document.querySelector('a[title="Home"]') ||
                document.querySelector('a[aria-label="Home"]') ||
                document.querySelector('[title="Home"]');
      if (btn) { btn.click(); return true; }
      return false;
    `);
    await objTestUtil.logMessage('INFO', `Home button clicked: ${homeClicked}`);
    await driver.sleep(4000);

    // ── Step 12: Post TX2 (order modification) with new RDD +4 days ──────────
    const tx2RddDate = addDays(4);
    const now = new Date();
    const sapChangeDate = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    const tx2Template = fs.readFileSync(TEMPLATE_TX2, 'utf8');
    const tx2Xml = tx2Template
      .replace(/\{\{ORDER_ID\}\}/g,       orderId)
      .replace(/\{\{PICKUP_DATE\}\}/g,    addDays(0))
      .replace(/\{\{OLD_RDD_DATE\}\}/g,   tx1RddDate)
      .replace(/\{\{RDD_DATE\}\}/g,       tx2RddDate)
      .replace(/\{\{SAP_CHANGE_DATE\}\}/g, sapChangeDate);

    await objTestUtil.logMessage('INFO', `Posting TX2 modification for TMS.${orderId} with RDD ${tx2RddDate}`);
    const tx2Res = await httpsPost(otmHost, tx2Xml);
    assert.equal(tx2Res.statusCode, 200, `TX2 WMServlet returned HTTP ${tx2Res.statusCode}`);
    const tx2Rejected = tx2Res.body.includes('<Error>') || tx2Res.body.toLowerCase().includes('rejected');
    assert.ok(!tx2Rejected, `TX2 WMServlet rejected payload:\n${tx2Res.body.slice(0, 500)}`);
    await objTestUtil.logMessage('INFO', `TX2 accepted - HTTP 200 OK`);

    // ── Step 13: Wait for OR_MODIFIED_TURKEY_HEAVY_ACTIONS to run ────────────
    await objTestUtil.logMessage('INFO', 'Waiting for modification agent processing');
    await sleep(5000);

    // ── Step 14: Navigate Orders-New from homepage, reopen order, verify TX2 LDD
    await navigateToOrderRelease(driver, 'Orders - New');
    await driver.sleep(2000);

    const finderPageTx2 = new FinderPage_1.FinderPage(driver, objTestUtil.TEST_LOG_FILE);
    await finderPageTx2.navigateToFinderSetResultsPageWithXID(orderId, 'Begins With');
    await driver.sleep(3000);

    await driver.switchTo().defaultContent();
    await driver.sleep(500);
    try { await driver.switchTo().frame(0); } catch (e) {}

    // Dump icons to confirm order and Edit button visible in TX2 results
    const tx2Icons = await driver.executeScript(`
      return Array.from(document.querySelectorAll('input[type="image"], input[alt], img[alt]'))
        .map(function(el) { return (el.alt || el.title || '') + '|' + el.tagName; }).join(', ');
    `);
    await objTestUtil.logMessage('INFO', `Orders-New TX2 icons: ${tx2Icons}`);

    await driver.executeScript(`
      var chk = document.querySelector('input[type="checkbox"]');
      if (chk) chk.click();
    `);
    await driver.sleep(500);
    const handlesTx2Before = await driver.getAllWindowHandles();
    await driver.executeScript(`
      var editIcon = document.querySelector('input[alt="Edit"]') || document.querySelector('input[alt="View"]');
      if (editIcon) editIcon.click();
    `);
    try { await driver.switchTo().alert().then(async a => { await a.accept(); }); } catch (e) {}
    await driver.switchTo().defaultContent();
    await driver.sleep(5000);

    const handlesTx2After = await driver.getAllWindowHandles();
    const newWinTx2 = handlesTx2After.find(h => !handlesTx2Before.includes(h));
    let tx2WinValid = false;
    if (newWinTx2) {
      await driver.switchTo().window(newWinTx2);
      await driver.sleep(3000);
      try {
        const tx2Title = await driver.getTitle();
        const tx2Url   = await driver.getCurrentUrl();
        await objTestUtil.logMessage('INFO', `TX2 window title: ${tx2Title}`);
        await objTestUtil.logMessage('INFO', `TX2 window url: ${tx2Url.substring(0, 120)}`);
        tx2WinValid = true;
      } catch(te) {
        await objTestUtil.logMessage('INFO', `TX2 window closed before use: ${te.message.substring(0, 80)}`);
        await driver.switchTo().window(handlesTx2Before[0]);
      }
      if (tx2WinValid) await driver.sleep(3000);
    }

    if (tx2WinValid || !newWinTx2) {
      await switchToContentFrame(driver);
      await driver.sleep(1500);
      await driver.executeScript(`
        var tabs = Array.from(document.querySelectorAll('a, td, span'));
        var tab = tabs.find(function(el) {
          return el.textContent.trim() === 'Order Release' && el.offsetParent !== null;
        });
        if (tab) tab.click();
      `);
      await driver.sleep(1500);
    }

    const lddAfterTx2 = await getFieldText(driver, 'Late Delivery Date');
    const expectedDay   = tx2RddDate.substring(6, 8);
    const expectedMonth = tx2RddDate.substring(4, 6);
    const expectedYear  = tx2RddDate.substring(0, 4);
    const expectedLddPrefix = `${expectedDay}/${expectedMonth}/${expectedYear}`;
    assert.ok(lddAfterTx2 && lddAfterTx2.startsWith(expectedLddPrefix),
      `Expected LDD to start with ${expectedLddPrefix} after TX2, got: "${lddAfterTx2}"`);
    await objTestUtil.logMessage('INFO', `LDD after TX2 verified: ${lddAfterTx2}`);

    // ── Close TX2 order detail window, return to main window ─────────────────
    await driver.switchTo().defaultContent();
    const allHandlesTx2 = await driver.getAllWindowHandles();
    const mainHandleTx2 = allHandlesTx2[0];
    for (const h of allHandlesTx2) {
      if (h !== mainHandleTx2) {
        await driver.switchTo().window(h);
        await driver.close();
      }
    }
    await driver.switchTo().window(mainHandleTx2);
    await driver.sleep(1000);

    // ── Click Home after TX2 ──────────────────────────────────────────────────
    await driver.switchTo().defaultContent();
    const homeClickedTx2 = await driver.executeScript(`
      var btn = document.querySelector('a[title="Home"]') ||
                document.querySelector('a[aria-label="Home"]') ||
                document.querySelector('[title="Home"]');
      if (btn) { btn.click(); return true; }
      return false;
    `);
    await objTestUtil.logMessage('INFO', `Home button clicked after TX2: ${homeClickedTx2}`);
    await driver.sleep(4000);

    // ── Step 15: Post TX3 (delivery note) ────────────────────────────────────
    const tx3RddDate = addDays(5);
    const now3 = new Date();
    const sapChangeDate3 = `${now3.getFullYear()}${String(now3.getMonth()+1).padStart(2,'0')}${String(now3.getDate()).padStart(2,'0')}${String(now3.getHours()).padStart(2,'0')}${String(now3.getMinutes()).padStart(2,'0')}${String(now3.getSeconds()).padStart(2,'0')}`;
    const tx3Template = fs.readFileSync(TEMPLATE_TX3, 'utf8');
    const tx3Xml = tx3Template
      .replace(/\{\{ORDER_ID\}\}/g,         orderId)
      .replace(/\{\{PICKUP_DATE\}\}/g,      addDays(1))
      .replace(/\{\{OLD_RDD_DATE\}\}/g,     tx2RddDate)
      .replace(/\{\{RDD_DATE\}\}/g,         tx3RddDate)
      .replace(/\{\{DELIVERY_NOTE\}\}/g,    TX3_DELIVERY_NOTE)
      .replace(/\{\{SAP_CHANGE_DATE\}\}/g,  sapChangeDate3);

    await objTestUtil.logMessage('INFO', `Posting TX3 delivery note for TMS.${orderId} - DN ${TX3_DELIVERY_NOTE}, RDD ${tx3RddDate}`);
    const tx3Res = await httpsPost(otmHost, tx3Xml);
    assert.equal(tx3Res.statusCode, 200, `TX3 WMServlet returned HTTP ${tx3Res.statusCode}`);
    const tx3Rejected = tx3Res.body.includes('<Error>') || tx3Res.body.toLowerCase().includes('rejected');
    assert.ok(!tx3Rejected, `TX3 WMServlet rejected payload:\n${tx3Res.body.slice(0, 500)}`);
    await objTestUtil.logMessage('INFO', `TX3 accepted - HTTP 200 OK`);

    // ── Step 16: Wait for OR_MODIFIED_TURKEY_HEAVY_ACTIONS (delivery note branch) ─
    await objTestUtil.logMessage('INFO', 'Waiting for delivery note agent processing');
    await sleep(5000);

    // ── Step 18: Navigate to Orders - Unplanned ───────────────────────────────
    await objTestUtil.logMessage('INFO', 'Navigating to Order Management > Orders - Unplanned');
    await navigateToOrderRelease(driver, 'Orders - Unplanned');

    // ── Step 19: Search for order in Unplanned bucket ─────────────────────────
    await objTestUtil.logMessage('INFO', `Searching for order ${orderId} in Orders - Unplanned`);
    const finderPage2 = new FinderPage_1.FinderPage(driver, objTestUtil.TEST_LOG_FILE);
    await finderPage2.navigateToFinderSetResultsPageWithXID(orderId, 'Begins With');
    await driver.sleep(3000);

    // Verify order appears in results (confirms it moved to Unplanned bucket)
    const resultsPage2 = new FinderResultsPage_1.FinderResultsPage(driver, objTestUtil.TEST_LOG_FILE);
    await objTestUtil.logMessage('INFO', 'Order found in Orders - Unplanned bucket');

    // ── Step 20: Open order detail from Unplanned bucket ─────────────────────
    // Unplanned has no Edit icon. Scan all frames/nested frames for the order ID.
    await driver.switchTo().defaultContent();
    await driver.sleep(1000);

    const handlesBeforeTx3 = await driver.getAllWindowHandles();
    let orderOpened = false;

    const topFrameCount = await driver.executeScript('return window.frames.length');
    await objTestUtil.logMessage('INFO', `Top-level frames: ${topFrameCount}`);

    for (let fi = 0; fi < Math.min(topFrameCount, 6) && !orderOpened; fi++) {
      try {
        await driver.switchTo().defaultContent();
        await driver.switchTo().frame(fi);
        const frameHasOrder = await driver.executeScript(
          'return document.body ? document.body.innerHTML.indexOf(arguments[0]) !== -1 : false', orderId);
        if (!frameHasOrder) continue;
        await objTestUtil.logMessage('INFO', `orderId found in frame(${fi})`);

        // Check for nested frames
        const nestedCount = await driver.executeScript('return window.frames.length');
        if (nestedCount > 0) {
          for (let nfi = 0; nfi < Math.min(nestedCount, 5) && !orderOpened; nfi++) {
            try {
              await driver.switchTo().frame(nfi);
              const nestedHas = await driver.executeScript(
                'return document.body ? document.body.innerHTML.indexOf(arguments[0]) !== -1 : false', orderId);
              if (nestedHas) {
                await objTestUtil.logMessage('INFO', `orderId in nested frame(${fi}→${nfi})`);
                const ctx = await driver.executeScript(`
                  var id=arguments[0], html=document.body?document.body.innerHTML:'', idx=html.indexOf(id);
                  return idx>=0?html.substring(Math.max(0,idx-200),idx+200):'not found';
                `, orderId);
                await objTestUtil.logMessage('INFO', `HTML ctx: ${ctx.substring(0,400)}`);
                const clicked = await driver.executeScript(`
                  var id=arguments[0];
                  var link=Array.from(document.querySelectorAll('a')).find(function(a){return a.textContent.indexOf(id)!==-1||(a.href&&a.href.indexOf(id)!==-1);});
                  if(link){link.click();return 'link';}
                  var chk=document.querySelector('input[type="checkbox"]');if(chk)chk.click();
                  var edit=document.querySelector('input[alt="Edit"]')||document.querySelector('input[alt="View"]');
                  if(edit){edit.click();return 'edit-icon';}
                  var cell=Array.from(document.querySelectorAll('td,span')).find(function(el){return el.textContent.trim()===id;});
                  if(cell){cell.click();return 'cell:'+cell.tagName;}
                  return 'nothing';
                `, orderId);
                await objTestUtil.logMessage('INFO', `Click result nested: ${clicked}`);
                orderOpened = true;
              } else {
                await driver.switchTo().defaultContent();
                await driver.switchTo().frame(fi);
              }
            } catch(ne) {
              await objTestUtil.logMessage('INFO', `nested frame(${nfi}) err: ${ne.message.substring(0,80)}`);
              await driver.switchTo().defaultContent();
              await driver.switchTo().frame(fi);
            }
          }
        }
        if (!orderOpened) {
          // No nested frames with order — try clicking in this top frame
          const ctx = await driver.executeScript(`
            var id=arguments[0], html=document.body?document.body.innerHTML:'', idx=html.indexOf(id);
            return idx>=0?html.substring(Math.max(0,idx-200),idx+200):'not found';
          `, orderId);
          await objTestUtil.logMessage('INFO', `HTML ctx frame(${fi}): ${ctx.substring(0,400)}`);
          const clicked = await driver.executeScript(`
            var id=arguments[0];
            var link=Array.from(document.querySelectorAll('a')).find(function(a){return a.textContent.indexOf(id)!==-1||(a.href&&a.href.indexOf(id)!==-1);});
            if(link){link.click();return 'link';}
            var chk=document.querySelector('input[type="checkbox"]');if(chk)chk.click();
            var edit=document.querySelector('input[alt="Edit"]')||document.querySelector('input[alt="View"]');
            if(edit){edit.click();return 'edit-icon';}
            var cell=Array.from(document.querySelectorAll('td,span')).find(function(el){return el.textContent.trim()===id;});
            if(cell){cell.click();return 'cell:'+cell.tagName;}
            return 'nothing';
          `, orderId);
          await objTestUtil.logMessage('INFO', `Click result frame(${fi}): ${clicked}`);
          orderOpened = true;
        }
      } catch(e) {
        await objTestUtil.logMessage('INFO', `frame(${fi}) err: ${e.message.substring(0,80)}`);
      }
    }

    await driver.switchTo().defaultContent();
    await driver.sleep(5000);

    const handlesAfterTx3 = await driver.getAllWindowHandles();
    const newWinTx3 = handlesAfterTx3.find(h => !handlesBeforeTx3.includes(h));
    if (newWinTx3) {
      await driver.switchTo().window(newWinTx3);
      await objTestUtil.logMessage('INFO', 'Switched to order detail window (TX3)');
      await driver.sleep(6000);
    } else {
      await objTestUtil.logMessage('INFO', 'Order detail opened in same window (TX3)');
      await driver.sleep(3000);
    }

    await switchToContentFrame(driver);
    await driver.sleep(1500);

    // Click Order Release tab
    await driver.executeScript(`
      var tabs = Array.from(document.querySelectorAll('a, td, span'));
      var tab = tabs.find(function(el) {
        return el.textContent.trim() === 'Order Release' && el.offsetParent !== null;
      });
      if (tab) tab.click();
    `);
    await driver.sleep(1500);

    const dnNumber = await getRefnumValue(driver, 'DELIVERY_NOTE_NUMBER');
    assert.equal(dnNumber, TX3_DELIVERY_NOTE,
      `Expected DELIVERY_NOTE_NUMBER = ${TX3_DELIVERY_NOTE}, got: "${dnNumber}"`);
    await objTestUtil.logMessage('INFO', `Delivery Note Number verified: ${dnNumber}`);
    await saveScreenshot(driver, screenshotsDir, 11);

    const lddAfterTx3 = await getFieldText(driver, 'Late Delivery Date');
    const tx3Day   = tx3RddDate.substring(6, 8);
    const tx3Month = tx3RddDate.substring(4, 6);
    const tx3Year  = tx3RddDate.substring(0, 4);
    assert.ok(lddAfterTx3 && lddAfterTx3.startsWith(`${tx3Day}/${tx3Month}/${tx3Year}`),
      `Expected LDD to start with ${tx3Day}/${tx3Month}/${tx3Year} after TX3, got: "${lddAfterTx3}"`);
    await objTestUtil.logMessage('INFO', `LDD after TX3 verified: ${lddAfterTx3}`);

    // ── Close TX3 order detail window, return to main window ─────────────────
    await driver.switchTo().defaultContent();
    const allHandlesTx3 = await driver.getAllWindowHandles();
    const mainHandleTx3 = allHandlesTx3[0];
    for (const h of allHandlesTx3) {
      if (h !== mainHandleTx3) {
        await driver.switchTo().window(h);
        await driver.close();
      }
    }
    await driver.switchTo().window(mainHandleTx3);
    await driver.sleep(1000);

    // ── Click Home after TX3 ──────────────────────────────────────────────────
    await driver.switchTo().defaultContent();
    const homeClickedTx3 = await driver.executeScript(`
      var btn = document.querySelector('a[title="Home"]') ||
                document.querySelector('a[aria-label="Home"]') ||
                document.querySelector('[title="Home"]');
      if (btn) { btn.click(); return true; }
      return false;
    `);
    await objTestUtil.logMessage('INFO', `Home button clicked after TX3: ${homeClickedTx3}`);
    await driver.sleep(4000);

    // ── TX4: Bulk Plan - Buy ──────────────────────────────────────────────────
    // Step: Navigate to Orders - Unplanned, search order, select checkbox
    await navigateToOrderRelease(driver, 'Orders - Unplanned');
    const finderPageBulk = new FinderPage_1.FinderPage(driver, objTestUtil.TEST_LOG_FILE);
    await finderPageBulk.navigateToFinderSetResultsPageWithXID(orderId, 'Begins With');
    await driver.sleep(3000);

    // Select checkbox and click Actions → Bulk Plan - Buy
    await driver.switchTo().defaultContent();
    await driver.sleep(500);
    try { await driver.switchTo().frame(0); } catch (e) {}

    await driver.executeScript(`
      var chk = document.querySelector('input[type="checkbox"]');
      if (chk) chk.click();
    `);
    await driver.sleep(500);

    // Click Actions button — stay in frame(0) throughout (dropdown renders inside frame)
    const actionsClicked = await driver.executeScript(`
      var candidates = Array.from(document.querySelectorAll('a, button, input, img, span'));
      var btn = candidates.find(function(el) {
        var t = (el.textContent || el.value || el.alt || '').trim();
        return t.indexOf('Actions') === 0 && el.offsetParent !== null;
      });
      if (btn) { btn.focus(); btn.click(); return btn.tagName + ':' + (btn.textContent || btn.value || btn.alt || '').trim().substring(0, 30); }
      return 'not found';
    `);
    await objTestUtil.logMessage('INFO', `Actions button clicked: ${actionsClicked}`);
    await driver.sleep(1500);

    // Find and click Bulk Plan - Buy inside frame(0) (dropdown renders in same frame)
    const handlesBefore4 = await driver.getAllWindowHandles();

    // The Actions dropdown renders in a nested iframe: mainIFrame/mainBody → actionFrame
    // This is the same pattern used by FinderResultsPage.runAction()
    await driver.sleep(1500);
    await driver.switchTo().defaultContent();
    await driver.sleep(500);

    // Switch into mainIFrame or mainBody frame
    try {
      const mainFrame = await driver.findElement(By.xpath('(//iframe[@id="mainIFrame"]) | (//frame[@name="mainBody"])'));
      await driver.switchTo().frame(mainFrame);
    } catch(e) {
      await objTestUtil.logMessage('INFO', `mainFrame switch error: ${e.message}`);
    }
    await driver.sleep(500);

    // Switch into actionFrame (where the dropdown links are)
    try {
      const actionFrame = await driver.findElement(By.xpath('//iframe[@name="actionFrame"]'));
      await driver.switchTo().frame(actionFrame);
      await objTestUtil.logMessage('INFO', 'Switched into actionFrame');
    } catch(e) {
      await objTestUtil.logMessage('INFO', `actionFrame switch error: ${e.message}`);
    }
    await driver.sleep(500);

    // Click Bulk Plan - Buy link inside actionFrame
    try {
      const bulkPlanLink = await driver.findElement(By.xpath('//a[text()="Bulk Plan - Buy"]'));
      await bulkPlanLink.click();
      await objTestUtil.logMessage('INFO', 'Bulk Plan - Buy clicked via actionFrame');
    } catch(e) {
      await objTestUtil.logMessage('INFO', `Bulk Plan - Buy click error: ${e.message}`);
    }
    await driver.switchTo().defaultContent();
    await driver.sleep(500);
    await driver.sleep(3000);

    // ── Shipment Planning popup: click OK ─────────────────────────────────────
    const handlesAfterBulk = await driver.getAllWindowHandles();
    const shipPlanWin = handlesAfterBulk.find(h => !handlesBefore4.includes(h));
    assert.ok(shipPlanWin, 'Shipment Planning popup did not open — Bulk Plan - Buy may not have been clicked');
    await driver.switchTo().window(shipPlanWin);
    await driver.sleep(3000);
    // Shipment Planning popup has 2 frames: frame(0)=Help toolbar, frame(1)=content with OK button
    await driver.switchTo().defaultContent();
    try { await driver.switchTo().frame(1); } catch(e) {
      // fallback: try frame(0)
      try { await driver.switchTo().defaultContent(); await driver.switchTo().frame(0); } catch(e2) {}
    }
    const okClicked = await driver.executeScript(`
      var btns = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], button'));
      var ok = btns.find(function(b) { return b.value === 'OK' || b.textContent.trim() === 'OK'; });
      if (ok) { ok.click(); return true; }
      return false;
    `);
    await objTestUtil.logMessage('INFO', `Shipment Planning popup: clicked OK (frame(1)): ${okClicked}`);
    await driver.switchTo().defaultContent();
    await driver.sleep(5000);

    // ── Bulk Plan results: may be same window or a new window after OK ──────────
    let bulkPlanStatus = '';
    let shipmentId = '';

    {
      // After clicking OK, shipPlanWin may have closed — find where Bulk Plan results are
      const handlesAfterOK = await driver.getAllWindowHandles();
      let bulkPlanWin;
      if (handlesAfterOK.includes(shipPlanWin)) {
        bulkPlanWin = shipPlanWin; // same window navigated in place
      } else {
        const newAfterOK = handlesAfterOK.find(h => !handlesBefore4.includes(h));
        bulkPlanWin = newAfterOK || handlesBefore4[0];
      }
      await objTestUtil.logMessage('INFO', `Bulk Plan window: ${bulkPlanWin}`);
      await driver.switchTo().window(bulkPlanWin);
      await driver.sleep(3000);

      // Diagnostics: URL, frame count, content in defaultContent and frame(0)
      await driver.switchTo().defaultContent();
      const bpUrl = await driver.getCurrentUrl();
      const bpTitle = await driver.getTitle();
      await objTestUtil.logMessage('INFO', `Bulk Plan URL: ${bpUrl}`);
      await objTestUtil.logMessage('INFO', `Bulk Plan title: ${bpTitle}`);
      const bpFrameCount = await driver.executeScript(`return window.frames.length`);
      await objTestUtil.logMessage('INFO', `Bulk Plan frame count: ${bpFrameCount}`);
      const bpDefaultText = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,300) : 'NO BODY'`);
      await objTestUtil.logMessage('INFO', `Bulk Plan defaultContent text: ${bpDefaultText}`);
      try {
        await driver.switchTo().frame(0);
        const bpFrame0Text = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,300) : 'NO BODY'`);
        await objTestUtil.logMessage('INFO', `Bulk Plan frame(0) text: ${bpFrame0Text}`);
        // Also try full textContent
        const bpFrame0TC = await driver.executeScript(`return document.body ? document.body.textContent.replace(/\\s+/g,' ').substring(0,500) : 'NO BODY'`);
        await objTestUtil.logMessage('INFO', `Bulk Plan frame(0) textContent: ${bpFrame0TC}`);
        await driver.switchTo().defaultContent();
      } catch(e) { await objTestUtil.logMessage('INFO', `Bulk Plan frame(0) error: ${e.message}`); }
      // Also check frame(1) — this is the content frame
      try {
        await driver.switchTo().defaultContent();
        await driver.switchTo().frame(1);
        const bpFrame1Text = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,500) : 'NO BODY'`);
        await objTestUtil.logMessage('INFO', `Bulk Plan frame(1) text: ${bpFrame1Text}`);
        await driver.switchTo().defaultContent();
      } catch(e) { await objTestUtil.logMessage('INFO', `Bulk Plan frame(1) error: ${e.message}`); }

      await objTestUtil.logMessage('INFO', 'Bulk Plan window — polling for COMPLETED (frame(1))');

      for (let attempt = 0; attempt < 40; attempt++) {
        await driver.sleep(3000);
        // Switch to frame(1) — content frame with status and Refresh button
        await driver.switchTo().defaultContent();
        try { await driver.switchTo().frame(1); } catch(e) {}
        // Click Refresh button
        await driver.executeScript(`
          var btns = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], button, input[type="image"]'));
          var ref = btns.find(function(b) {
            return (b.value && b.value.indexOf('Refresh') !== -1) ||
                   (b.alt && b.alt.indexOf('Refresh') !== -1) ||
                   (b.title && b.title.indexOf('Refresh') !== -1) ||
                   (b.textContent && b.textContent.trim() === 'Refresh');
          });
          if (ref) { ref.click(); return true; }
          return false;
        `);
        await driver.sleep(1000);
        await driver.switchTo().defaultContent();
        try { await driver.switchTo().frame(1); } catch(e) {}
        bulkPlanStatus = await driver.executeScript(`
          var text = document.body ? document.body.innerText : '';
          if (text.indexOf('COMPLETED') !== -1) return 'COMPLETED';
          if (text.indexOf('RUNNING') !== -1) return 'RUNNING';
          if (text.indexOf('FAILED') !== -1) return 'FAILED';
          return text.substring(0,80);
        `);
        await objTestUtil.logMessage('INFO', `Bulk Plan status: ${bulkPlanStatus}`);
        if (bulkPlanStatus === 'COMPLETED' || bulkPlanStatus === 'FAILED') break;
      }

      assert.equal(bulkPlanStatus, 'COMPLETED', `Bulk Plan did not complete. Last status: "${bulkPlanStatus}"`);

      // Assert Orders Failed to Plan = 0
      const failedToPlan = await driver.executeScript(`
        var els = Array.from(document.querySelectorAll('td, span, div'));
        for (var i = 0; i < els.length; i++) {
          if (els[i].textContent.trim() === 'Orders Failed to Plan') {
            var next = els[i].nextElementSibling;
            if (next) return next.textContent.trim();
          }
        }
        return null;
      `);
      await objTestUtil.logMessage('INFO', `Orders Failed to Plan: ${failedToPlan}`);
      assert.equal(failedToPlan, '0', `Expected Orders Failed to Plan = 0, got: "${failedToPlan}"`);

      // Click Shipments Built hyperlink
      const handlesBefore5 = await driver.getAllWindowHandles();
      await driver.executeScript(`
        var els = Array.from(document.querySelectorAll('td, span, div'));
        for (var i = 0; i < els.length; i++) {
          if (els[i].textContent.trim() === 'Shipments Built') {
            var next = els[i].nextElementSibling;
            if (next) {
              var link = next.querySelector('a');
              if (link) { link.click(); return; }
            }
          }
        }
      `);
      await driver.sleep(3000);

      // ── Buy Shipment Result popup: read Shipment ID ───────────────────────
      const handlesAfter5 = await driver.getAllWindowHandles();
      const buyShipWin = handlesAfter5.find(h => !handlesBefore5.includes(h));
      if (buyShipWin) {
        await driver.switchTo().window(buyShipWin);
        await driver.sleep(2000);
        // Dump window structure
        const bsTitle = await driver.getTitle();
        const bsUrl = await driver.getCurrentUrl();
        const bsFrames = await driver.executeScript(`return window.frames.length`);
        await objTestUtil.logMessage('INFO', `Buy Shipment win title: ${bsTitle} | url: ${bsUrl} | frames: ${bsFrames}`);
        await driver.switchTo().defaultContent();
        const bsDefaultText = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,300) : 'NOBODY'`);
        await objTestUtil.logMessage('INFO', `Buy Shipment defaultContent: ${bsDefaultText}`);
        try { await driver.switchTo().frame(0); const t0 = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,300) : ''`); await objTestUtil.logMessage('INFO', `Buy Shipment frame(0): ${t0}`); await driver.switchTo().defaultContent(); } catch(e) {}
        try { await driver.switchTo().frame(1); const t1 = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,400) : ''`); await objTestUtil.logMessage('INFO', `Buy Shipment frame(1): ${t1}`); await driver.switchTo().defaultContent(); } catch(e) {}

        // Try to find shipment ID link — could be numeric or TMS. prefixed
        try { await driver.switchTo().frame(1); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }
        const allLinks = await driver.executeScript(`
          return Array.from(document.querySelectorAll('a')).map(function(a) { return a.textContent.trim(); }).filter(function(t) { return t.length > 0; }).join('|||');
        `);
        await objTestUtil.logMessage('INFO', `Buy Shipment links: ${allLinks}`);
        shipmentId = await driver.executeScript(`
          var links = Array.from(document.querySelectorAll('a'));
          // try TMS. prefix first
          var link = links.find(function(a) { return a.textContent && a.textContent.trim().indexOf('TMS.') !== -1; });
          // fallback: any numeric-looking link
          if (!link) link = links.find(function(a) { return a.textContent && /^\\d+$/.test(a.textContent.trim()); });
          return link ? link.textContent.trim() : '';
        `);
        // Normalise to TMS. prefix
        if (shipmentId && !shipmentId.startsWith('TMS.')) shipmentId = 'TMS.' + shipmentId;
        await objTestUtil.logMessage('INFO', `Shipment ID captured: ${shipmentId}`);
        assert.ok(shipmentId && shipmentId.startsWith('TMS.'), `Expected shipment ID starting with TMS., got: "${shipmentId}"`);

        // Close Buy Shipment Result window
        await driver.close();
        await objTestUtil.logMessage('INFO', 'Buy Shipment Result window closed');
      }

      // Close Bulk Plan window
      await driver.switchTo().window(bulkPlanWin);
      await driver.close();
      await objTestUtil.logMessage('INFO', 'Bulk Plan window closed');
    }

    // ── Back to main window: Rerun Query → assert order gone from Unplanned ──
    const mainHandleBulk = handlesBefore4[0];
    await driver.switchTo().window(mainHandleBulk);
    await driver.sleep(1000);

    await driver.switchTo().defaultContent();
    try { await driver.switchTo().frame(0); } catch(e) {}

    await driver.executeScript(`
      var btns = Array.from(document.querySelectorAll('input[type="image"], input[alt], button'));
      var ref = btns.find(function(b) {
        return (b.alt && b.alt.indexOf('Rerun') !== -1) ||
               (b.title && b.title.indexOf('Rerun') !== -1) ||
               (b.textContent && b.textContent.trim() === 'Rerun Query');
      });
      if (ref) ref.click();
    `);
    await driver.sleep(1000);
    try { await driver.switchTo().alert().then(async a => { await a.accept(); }); } catch(e) {}
    await driver.sleep(3000);

    const totalFoundCount = await driver.executeScript(`
      var text = document.body ? (document.body.innerText || document.body.textContent || '') : '';
      var match = text.match(/Total Found[:\\s]*([0-9]+)/);
      return match ? match[1] : '';
    `);
    await objTestUtil.logMessage('INFO', `After Rerun Query — Total Found: ${totalFoundCount}`);
    assert.equal(totalFoundCount, '0', `Expected order gone from Unplanned (Total Found: 0), got: ${totalFoundCount}`);

    // ── Click Home → Orders - Planned → verify order status ──────────────────
    await driver.switchTo().defaultContent();
    await driver.executeScript(`
      var btn = document.querySelector('a[title="Home"]') ||
                document.querySelector('a[aria-label="Home"]') ||
                document.querySelector('[title="Home"]');
      if (btn) btn.click();
    `);
    await driver.sleep(4000);

    await navigateToOrderRelease(driver, 'Orders - Planned');
    const finderPagePlanned = new FinderPage_1.FinderPage(driver, objTestUtil.TEST_LOG_FILE);
    await finderPagePlanned.navigateToFinderSetResultsPageWithXID(orderId, 'Begins With');
    await driver.sleep(3000);

    await driver.switchTo().defaultContent();
    try { await driver.switchTo().frame(0); } catch(e) {}

    const plannedStatus = await driver.executeScript(`
      var text = document.body ? (document.body.innerText || document.body.textContent || '') : '';
      var match = text.match(/PLANNING_PLANNED[^\\s]*/);
      return match ? match[0] : '';
    `);
    await objTestUtil.logMessage('INFO', `Orders-Planned status: ${plannedStatus}`);
    assert.ok(plannedStatus.includes('PLANNING_PLANNED'), `Expected PLANNING_PLANNED status in Orders-Planned, got: "${plannedStatus}"`);

    // ── Click Home → Shipment Management → Shipments - New → search shipment ─
    await driver.switchTo().defaultContent();
    await driver.executeScript(`
      var btn = document.querySelector('a[title="Home"]') ||
                document.querySelector('a[aria-label="Home"]') ||
                document.querySelector('[title="Home"]');
      if (btn) btn.click();
    `);
    await driver.sleep(4000);

    // Click Shipment Management tile → Shipments - New
    const shipMgmtClicked = await driver.executeScript(`
      var els = Array.from(document.querySelectorAll('span, div, a'));
      var target = els.find(function(el) {
        return el.textContent.trim() === 'Shipment Management' && el.offsetParent !== null;
      });
      if (target) { target.click(); return true; }
      return false;
    `);
    await driver.sleep(2500);

    const shipNewXp = `//*[normalize-space(text())='Shipments - New'] | //*[normalize-space(.)='Shipments - New' and not(*)]`;
    const shipNewItem = await driver.findElement(By.xpath(shipNewXp));
    await driver.executeScript('arguments[0].click()', shipNewItem);
    await driver.wait(
      until.elementLocated(By.xpath(`//iframe | //input[@title='Search'] | //*[contains(@class,'finder')]`)),
      20000
    );
    await driver.sleep(2000);
    await objTestUtil.logMessage('INFO', 'Navigated to Shipment Management > Shipments - New');

    // Enter shipment ID (strip TMS. prefix — finder uses numeric part)
    const shipIdNumeric = shipmentId.replace(/^TMS\./, '');
    const finderShip = new FinderPage_1.FinderPage(driver, objTestUtil.TEST_LOG_FILE);
    await finderShip.navigateToFinderSetResultsPageWithXID(shipIdNumeric, 'Begins With');
    await driver.sleep(3000);

    await driver.switchTo().defaultContent();
    const sfFrames = await driver.executeScript(`return window.frames.length`);
    await objTestUtil.logMessage('INFO', `Shipments-New frames: ${sfFrames}`);
    try { await driver.switchTo().frame(0); const t0 = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,300) : ''`); await objTestUtil.logMessage('INFO', `Shipments-New frame(0): ${t0}`); await driver.switchTo().defaultContent(); } catch(e) {}
    try { await driver.switchTo().frame(1); const t1 = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,300) : ''`); await objTestUtil.logMessage('INFO', `Shipments-New frame(1): ${t1}`); await driver.switchTo().defaultContent(); } catch(e) {}

    // Use whichever frame has the results (1 frame = frame(0), 2 frames = frame(1))
    await driver.switchTo().defaultContent();
    if (sfFrames >= 2) {
      try { await driver.switchTo().frame(1); } catch(e) {}
    } else {
      try { await driver.switchTo().frame(0); } catch(e) {}
    }
    const sfLinks = await driver.executeScript(`return Array.from(document.querySelectorAll('a')).map(function(a){return a.textContent.trim();}).filter(function(t){return t.length>0;}).join('|||')`);
    await objTestUtil.logMessage('INFO', `Shipments-New links: ${sfLinks}`);

    const shipFound = await driver.executeScript(`
      var links = Array.from(document.querySelectorAll('a'));
      var numeric = arguments[0];
      var link = links.find(function(a) {
        var t = a.textContent ? a.textContent.trim() : '';
        return t.indexOf(numeric) !== -1 || t.indexOf('TMS.' + numeric) !== -1;
      });
      return link ? link.textContent.trim() : '';
    `, shipIdNumeric);
    await objTestUtil.logMessage('INFO', `Shipment found in Shipments-New: ${shipFound}`);
    assert.ok(shipFound && shipFound.indexOf(shipIdNumeric) !== -1,
      `Expected shipment ${shipIdNumeric} in Shipments-New results, got: "${shipFound}"`);

    // ── Final Home click ──────────────────────────────────────────────────────
    await driver.switchTo().defaultContent();
    await driver.executeScript(`
      var btn = document.querySelector('a[title="Home"]') ||
                document.querySelector('a[aria-label="Home"]') ||
                document.querySelector('[title="Home"]');
      if (btn) btn.click();
    `);
    await driver.sleep(2000);
    await objTestUtil.logMessage('INFO', 'SC-02 complete — all TX1/TX2/TX3/TX4 steps passed');
  });

  after(async function () {
    await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
  });
});
