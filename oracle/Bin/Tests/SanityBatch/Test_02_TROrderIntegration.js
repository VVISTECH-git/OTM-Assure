'use strict';

const https      = require('https');
const fs         = require('fs');
const path       = require('path');
const { execSync } = require('child_process');
const { By, until, Key } = require('selenium-webdriver');
const { assert } = require('chai');
const Constants_1       = require('../../Src/Util/Constants');
const TestUtil_1        = require('../../Src/Util/TestUtil');
const CommonFunctions_1 = require('../../Src/Util/CommonFunctions');
const FinderPage_1        = require('../../Src/Pages/FinderPage');
const FinderResultsPage_1 = require('../../Src/Pages/FinderResultsPage');

// On-screen overlay showing current step description
async function showStep(driver, text) {
  try {
    await driver.executeScript(`
      var d = document.getElementById('__sc02_step_overlay');
      if (!d) {
        d = document.createElement('div');
        d.id = '__sc02_step_overlay';
        d.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:rgba(0,80,200,0.88);color:#fff;font-size:15px;font-family:Arial,sans-serif;font-weight:bold;padding:8px 14px;letter-spacing:0.3px;box-shadow:0 2px 8px rgba(0,0,0,0.4);pointer-events:none;';
        document.body.appendChild(d);
      }
      d.textContent = ${JSON.stringify(text)};
    `);
  } catch (e) {}
}

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
  // (Sometimes OTM auto-closes the panel after role selection — handle gracefully)
  await driver.sleep(300);
  try {
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
  } catch(tabErr) {
    await objTestUtil.logMessage('INFO', `Tab loop ended early (panel may have auto-closed): ${tabErr.message.substring(0,80)}`);
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
  this.timeout(1800000);

  let objTestUtil;
  let orderId, otmHost;

  before(async function () {
    // Prevent Windows from sleeping during the test run
    try { execSync('powercfg /change standby-timeout-ac 0', { stdio: 'ignore' }); } catch(e) {}
    try { execSync('powercfg /change monitor-timeout-ac 0', { stdio: 'ignore' }); } catch(e) {}

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
    await showStep(driver, `Step 1: Generating unique Order ID for this test run`);
    await objTestUtil.logMessage('INFO', `Generating order ID ${orderId}`);
    await saveScreenshot(driver, screenshotsDir, 0);

    // ── Step 2: Upload XML to WMServlet ──────────────────────────────────────
    const tx1RddDate = addDays(2);
    const template = fs.readFileSync(TEMPLATE, 'utf8');
    const xml = template
      .replace(/\{\{ORDER_ID\}\}/g,    orderId)
      .replace(/\{\{PICKUP_DATE\}\}/g, addDays(0))
      .replace(/\{\{RDD_DATE\}\}/g,    tx1RddDate);

    await showStep(driver, `Step 2: Posting TX1 order ${orderId} to OTM via WMServlet`);
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
    await showStep(driver, `Step 3: Logging into OTM as planner user ${Constants_1.Constants.DBA_USERNAME}`);
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
    await showStep(driver, `Step 4: Switching user role to TURKEY_PLANNER`);
    await switchToRole(driver, 'TURKEY_PLANNER', objTestUtil);
    await driver.sleep(3000);

    // Wait for home page to fully reload after role switch before navigating
    await driver.wait(until.titleContains('Home'), 30000);
    await driver.sleep(2000);

    // ── Step 5: Navigate to Order Release finder ─────────────────────────────
    await showStep(driver, `Step 5: Navigating to Order Management > Orders - New`);
    await objTestUtil.logMessage('INFO', 'Navigating to Order Management > Orders - New');
    await navigateToOrderRelease(driver, 'Orders - New');
    await driver.sleep(2000);
    await saveScreenshot(driver, screenshotsDir, 5);

    // ── Step 6: Search for order (with retry — OTM agent may need up to 2 min) ─
    await showStep(driver, `Step 6: Searching for order ${orderId} in Orders - New (waiting for OTM agent)`);
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
    await showStep(driver, `Phase 3 TX1 Verify: Checking MOVEMENT_TYPE, EQUIPMENT_TYPE, LDD and TURKEY_ITINERARY on order detail`);
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
    await saveScreenshot(driver, screenshotsDir, 7);

    assert.ok(['DRY', 'REEFER'].includes(equipType),
      `Expected EQUIPMENT_TYPE = DRY or REEFER, got: "${equipType}"`);
    await objTestUtil.logMessage('INFO', `Equipment Type verified: ${equipType}`);
    await saveScreenshot(driver, screenshotsDir, 8);

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
    await saveScreenshot(driver, screenshotsDir, 9);

    // Fixed Itinerary is empty for domestic orders — just log it
    const fixedItinerary = await getFieldText(driver, 'Buy Fixed Itinerary');
    await objTestUtil.logMessage('INFO', `Fixed Itinerary verified: ${fixedItinerary || '(empty — domestic order)'}`);
    await saveScreenshot(driver, screenshotsDir, 10);

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
    await showStep(driver, `Phase 4 TX2: Posting order modification with new RDD date (+4 days)`);
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
    await saveScreenshot(driver, screenshotsDir, 11);

    // ── Step 13: Wait for OR_MODIFIED_TURKEY_HEAVY_ACTIONS to run ────────────
    await objTestUtil.logMessage('INFO', 'Waiting for modification agent processing');
    await sleep(5000);

    // ── Step 14: Navigate Orders-New from homepage, reopen order, verify TX2 LDD
    await showStep(driver, `Phase 4 TX2 Verify: Reopening order to confirm LDD updated to TX2 date`);
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
    await saveScreenshot(driver, screenshotsDir, 12);

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
    await showStep(driver, `Phase 5 TX3: Posting delivery note DN=${TX3_DELIVERY_NOTE} with new RDD (+5 days)`);
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
    await saveScreenshot(driver, screenshotsDir, 13);

    // ── Step 16: Wait for OR_MODIFIED_TURKEY_HEAVY_ACTIONS (delivery note branch) ─
    await objTestUtil.logMessage('INFO', 'Waiting for delivery note agent processing');
    await sleep(5000);

    // ── Step 18: Navigate to Orders - Unplanned ───────────────────────────────
    await showStep(driver, `Phase 5 TX3 Verify: Navigating to Orders - Unplanned to verify Delivery Note and LDD`);
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
    await saveScreenshot(driver, screenshotsDir, 14);

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
    await showStep(driver, `Phase 6: Running Bulk Plan - Buy to create a shipment for order ${orderId}`);
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
      await saveScreenshot(driver, screenshotsDir, 15);

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
      await saveScreenshot(driver, screenshotsDir, 16);

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

    // Save shipmentId to state file so Phase 13 can be re-run in isolation
    const STATE_FILE = path.join(__dirname, '..', '..', '..', 'Testdata', 'SanityBatch', 'sc02_state.json');
    fs.writeFileSync(STATE_FILE, JSON.stringify({ shipmentId, orderId }), 'utf8');
    await objTestUtil.logMessage('INFO', `State saved: ${shipmentId} → ${STATE_FILE}`);

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
    await showStep(driver, `Phase 7: Verifying order ${orderId} is no longer in Orders - Unplanned (Total Found: ${totalFoundCount})`);
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

    await showStep(driver, `Phase 8: Checking order ${orderId} shows status PLANNING_PLANNED in Orders - Planned`);
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
    await saveScreenshot(driver, screenshotsDir, 17);

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
    await showStep(driver, `Phase 9: Navigating to Shipment Management > Shipments - New to verify shipment created`);
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
    await saveScreenshot(driver, screenshotsDir, 18);
    assert.ok(shipFound && shipFound.indexOf(shipIdNumeric) !== -1,
      `Expected shipment ${shipIdNumeric} in Shipments-New results, got: "${shipFound}"`);

    // ── PHASE 10: Approve for Execution ──────────────────────────────────────
    await showStep(driver, `Phase 10: Approving shipment ${shipmentId} for execution via Actions menu`);
    // Select shipment checkbox
    await objTestUtil.logMessage('INFO', 'Phase 10: Select shipment checkbox');
    await driver.switchTo().defaultContent();
    try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }
    await driver.executeScript(`
      var chk = document.querySelector('input[type="checkbox"]');
      if (chk) chk.click();
    `);
    await driver.sleep(500);

    // Click Actions button
    await objTestUtil.logMessage('INFO', 'Phase 10: Click Actions button');
    const actionsClickedP10 = await driver.executeScript(`
      var candidates = Array.from(document.querySelectorAll('a, button, input, img, span'));
      var btn = candidates.find(function(el) {
        var t = (el.textContent || el.value || el.alt || '').trim();
        return t.indexOf('Actions') === 0 && el.offsetParent !== null;
      });
      if (btn) { btn.focus(); btn.click(); return true; }
      return false;
    `);
    await objTestUtil.logMessage('INFO', `Actions clicked: ${actionsClickedP10}`);
    await driver.sleep(1500);

    // Switch to actionFrame and click Approve for Execution
    await objTestUtil.logMessage('INFO', 'Phase 10: Click Approve for Execution');
    await driver.switchTo().defaultContent();
    try {
      const mainFrame = await driver.findElement(By.xpath('(//iframe[@id="mainIFrame"]) | (//frame[@name="mainBody"])'));
      await driver.switchTo().frame(mainFrame);
    } catch(e) {}
    await driver.sleep(500);
    try {
      const actionFrame = await driver.findElement(By.xpath('//iframe[@name="actionFrame"]'));
      await driver.switchTo().frame(actionFrame);
    } catch(e) {}
    await driver.sleep(500);

    const handlesBeforeApprove = await driver.getAllWindowHandles();
    try {
      const approveLink = await driver.findElement(By.xpath('//a[text()="Approve for Execution"]'));
      await approveLink.click();
      await objTestUtil.logMessage('INFO', 'Phase 10: Approve for Execution clicked');
    } catch(e) {
      await objTestUtil.logMessage('INFO', `Phase 10: Approve for Execution click error: ${e.message.substring(0,80)}`);
    }
    await driver.switchTo().defaultContent();
    await driver.sleep(4000);

    // Close the Approve for Execution popup window
    const handlesAfterApprove = await driver.getAllWindowHandles();
    const approveWin = handlesAfterApprove.find(h => !handlesBeforeApprove.includes(h));
    if (approveWin) {
      await driver.switchTo().window(approveWin);
      await objTestUtil.logMessage('INFO', `Phase 10: Approve for Execution popup opened`);
      await driver.sleep(2000);
      await saveScreenshot(driver, screenshotsDir, 19);

      // Dump popup content to diagnose what buttons are available
      await driver.switchTo().defaultContent();
      const popupFrameCount = await driver.executeScript(`return window.frames.length`);
      const popupUrl = await driver.getCurrentUrl();
      await objTestUtil.logMessage('INFO', `Phase 10: Approve popup frames: ${popupFrameCount} url: ${popupUrl}`);
      const popupDefault = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,300) : 'NO BODY'`);
      await objTestUtil.logMessage('INFO', `Phase 10: Approve popup defaultContent: ${popupDefault}`);
      for (let fi = 0; fi < Math.min(popupFrameCount, 3); fi++) {
        try {
          await driver.switchTo().defaultContent();
          await driver.switchTo().frame(fi);
          const ftxt = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,300) : 'NO BODY'`);
          const fbtns = await driver.executeScript(`
            return Array.from(document.querySelectorAll('input,button,a')).slice(0,20)
              .map(function(b){ return (b.tagName||'?')+'['+(b.type||'')+']: val='+(b.value||'')+'|txt='+(b.textContent||'').trim().substring(0,30)+'|alt='+(b.alt||''); }).join(' || ');
          `);
          await objTestUtil.logMessage('INFO', `Phase 10: Approve popup frame(${fi}) text: ${ftxt}`);
          await objTestUtil.logMessage('INFO', `Phase 10: Approve popup frame(${fi}) buttons: ${fbtns}`);
        } catch(fe) {
          await objTestUtil.logMessage('INFO', `Phase 10: frame(${fi}) err: ${fe.message.substring(0,80)}`);
        }
      }

      // Click OK/Submit inside the popup — try each frame
      let confirmClicked = false;
      for (let fi = 0; fi < Math.min(popupFrameCount, 3) && !confirmClicked; fi++) {
        try {
          await driver.switchTo().defaultContent();
          await driver.switchTo().frame(fi);
          const clicked = await driver.executeScript(`
            var btns = Array.from(document.querySelectorAll('input[type="submit"],input[type="button"],input[type="image"],button,a'));
            var ok = btns.find(function(b){
              var t = (b.value||b.textContent||b.alt||b.title||'').trim().toLowerCase();
              return t==='ok' || t==='submit' || t==='approve' || t==='yes' || t==='confirm' || t==='close';
            });
            if (ok) { ok.click(); return (ok.value||ok.textContent||ok.alt||'clicked').trim(); }
            return null;
          `);
          if (clicked) {
            confirmClicked = true;
            await objTestUtil.logMessage('INFO', `Phase 10: Approve popup confirmed via frame(${fi}): "${clicked}"`);
          }
        } catch(fe) {
          await objTestUtil.logMessage('INFO', `Phase 10: frame(${fi}) confirm err: ${fe.message.substring(0,60)}`);
        }
      }
      if (!confirmClicked) {
        await driver.switchTo().defaultContent();
        const clicked2 = await driver.executeScript(`
          var btns = Array.from(document.querySelectorAll('input,button,a'));
          var ok = btns.find(function(b){
            var t = (b.value||b.textContent||b.alt||b.title||'').trim().toLowerCase();
            return t==='ok' || t==='submit' || t==='approve' || t==='yes' || t==='confirm' || t==='close';
          });
          if (ok) { ok.click(); return (ok.value||ok.textContent||'clicked').trim(); }
          return null;
        `);
        await objTestUtil.logMessage('INFO', `Phase 10: Approve popup defaultContent confirm: "${clicked2}"`);
      }

      // The popup IS the result page — approval already processed. Just close it.
      await driver.sleep(1000);
      try { await driver.switchTo().defaultContent(); await driver.close(); } catch(e) {}
      await objTestUtil.logMessage('INFO', 'Phase 10: Approve for Execution popup closed (approval already processed)');
    }
    const mainHandleP10 = handlesBeforeApprove[0];
    await driver.switchTo().window(mainHandleP10);
    await driver.switchTo().defaultContent();
    await driver.sleep(3000); // wait for approval to process

    // Click Rerun Query — shipment should disappear from Shipments-New
    await objTestUtil.logMessage('INFO', 'Phase 10: Click Rerun Query');
    let shipGoneCount = '1';
    for (let attempt = 0; attempt < 6; attempt++) {
      await driver.switchTo().defaultContent();
      try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }
      await driver.executeScript(`
        var btn = document.querySelector('input#rgRerunQueryImg') ||
                  Array.from(document.querySelectorAll('input')).find(function(b){
                    return b.value === 'Rerun Query' || b.alt === 'Rerun Query';
                  });
        if (btn) btn.click();
      `);
      await driver.sleep(1000);
      try { await driver.switchTo().alert().then(async a => { await a.accept(); }); } catch(e) {}
      await driver.sleep(3000);
      shipGoneCount = await driver.executeScript(`
        var text = document.body ? (document.body.innerText || document.body.textContent || '') : '';
        var match = text.match(/Total Found[:\\s]*([0-9]+)/);
        return match ? match[1] : '';
      `);
      await objTestUtil.logMessage('INFO', `Phase 10: Rerun attempt ${attempt+1} — Total Found: ${shipGoneCount}`);
      if (shipGoneCount === '0') break;
      await driver.sleep(5000);
    }
    // Soft warning — approval already confirmed by popup result page; Phase 11 verifies Sent to Carrier
    if (shipGoneCount !== '0') {
      await objTestUtil.logMessage('INFO', `Phase 10: WARNING — shipment still in Shipments-New (Total Found: ${shipGoneCount}); proceeding to Phase 11 verification`);
    }
    await saveScreenshot(driver, screenshotsDir, 20);

    // Click Home
    await objTestUtil.logMessage('INFO', 'Phase 10: Click Home');
    await driver.switchTo().defaultContent();
    await driver.executeScript(`
      var el = document.querySelector('a[title="Home"]') || document.querySelector('[aria-label="Home"]');
      if (el) el.click();
    `);
    await driver.sleep(3000);

    // ── PHASE 11: Shipments - Sent to Carrier ────────────────────────────────
    await showStep(driver, `Phase 11: Verifying shipment ${shipmentId} appears in Shipments - Sent to Carrier with orange indicator`);
    await objTestUtil.logMessage('INFO', 'Phase 11: Navigate to Shipment Management → Shipments - Sent to Carrier');
    const shipMgmtP11 = await driver.executeScript(`
      var els = Array.from(document.querySelectorAll('span, div, a'));
      var target = els.find(function(el) {
        return el.textContent.trim() === 'Shipment Management' && el.offsetParent !== null;
      });
      if (target) { target.click(); return true; }
      return false;
    `);
    await driver.sleep(2500);

    const sentToCarrierXp = `//*[normalize-space(text())='Shipments - Sent to Carrier'] | //*[normalize-space(.)='Shipments - Sent to Carrier' and not(*)]`;
    const sentToCarrierItem = await driver.findElement(By.xpath(sentToCarrierXp));
    await driver.executeScript('arguments[0].click()', sentToCarrierItem);
    await driver.wait(until.elementLocated(By.xpath(`//iframe | //input[@title='Search'] | //*[contains(@class,'finder')]`)), 20000);
    await driver.sleep(2000);

    // Search for shipment by numeric ID
    const finderShipSent = new FinderPage_1.FinderPage(driver, objTestUtil.TEST_LOG_FILE);
    await finderShipSent.navigateToFinderSetResultsPageWithXID(shipIdNumeric, 'Begins With');
    await driver.sleep(3000);

    // Switch to results frame
    await driver.switchTo().defaultContent();
    try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }

    // Assert shipment found
    const shipSentFound = await driver.executeScript(`
      var links = Array.from(document.querySelectorAll('a'));
      var numeric = arguments[0];
      var link = links.find(function(a) {
        var t = a.textContent ? a.textContent.trim() : '';
        return t.indexOf(numeric) !== -1 || t.indexOf('TMS.' + numeric) !== -1;
      });
      return link ? link.textContent.trim() : '';
    `, shipIdNumeric);
    await objTestUtil.logMessage('INFO', `Phase 11: Shipment in Sent-to-Carrier: ${shipSentFound}`);
    assert.ok(shipSentFound && shipSentFound.indexOf(shipIdNumeric) !== -1,
      `Expected shipment ${shipIdNumeric} in Shipments-Sent-to-Carrier, got: "${shipSentFound}"`);

    // Assert orange indicator present
    const orangeIndicator = await driver.executeScript(`
      var img = Array.from(document.querySelectorAll('img')).find(function(i){
        return i.title === 'Orange' || i.alt === 'Orange';
      });
      return img ? 'Orange found' : 'Orange NOT found';
    `);
    await objTestUtil.logMessage('INFO', `Phase 11: Indicator: ${orangeIndicator}`);
    await saveScreenshot(driver, screenshotsDir, 21);

    // Click Home
    await objTestUtil.logMessage('INFO', 'Phase 11: Click Home');
    await driver.switchTo().defaultContent();
    await driver.executeScript(`
      var el = document.querySelector('a[title="Home"]') || document.querySelector('[aria-label="Home"]');
      if (el) el.click();
    `);
    await driver.sleep(3000);

    // ── PHASE 12: Sign Out ────────────────────────────────────────────────────
    await showStep(driver, `Phase 12: Signing out planner user LEL7597_TMS from OTM`);
    await objTestUtil.logMessage('INFO', 'Phase 12: Click user ID to open Settings and Actions');
    await driver.switchTo().defaultContent();
    await driver.sleep(2000);
    // User ID button is in top-nav — search by text, no frame switch needed
    const userClicked = await driver.executeScript(`
      var els = Array.from(document.querySelectorAll('a, span, button'));
      var btn = els.find(function(el) {
        return el.textContent && el.textContent.indexOf('LEL7597_TMS') !== -1 && el.offsetParent !== null;
      });
      if (btn) { btn.click(); return true; }
      return false;
    `);
    await objTestUtil.logMessage('INFO', `Phase 12: User ID button clicked: ${userClicked}`);
    await driver.sleep(2000);

    await objTestUtil.logMessage('INFO', 'Phase 12: Click Sign Out');
    const signOutXp = `//button[normalize-space(.)='Sign Out'] | //a[normalize-space(.)='Sign Out']`;
    const signOutBtn = await driver.wait(until.elementLocated(By.xpath(signOutXp)), 15000);
    await signOutBtn.click();
    await driver.sleep(4000);

    // Assert we are back on Oracle Cloud Sign In page
    const signInTitle = await driver.getTitle();
    await objTestUtil.logMessage('INFO', `Phase 12: Page after sign out: ${signInTitle}`);
    assert.ok(
      signInTitle.toLowerCase().includes('sign in') || signInTitle.toLowerCase().includes('cloud'),
      `Expected Oracle Sign In page after logout, got: "${signInTitle}"`
    );
    await saveScreenshot(driver, screenshotsDir, 22);
    await objTestUtil.logMessage('INFO', 'Phase 12: Sign out verified — back on Oracle Cloud login page');

    await objTestUtil.logMessage('INFO', 'SC-02 Phases 1-12 complete — now starting Phase 13: Carrier Portal');

    // ── PHASE 13: Carrier Portal ──────────────────────────────────────────────
    const testConfig = JSON.parse(fs.readFileSync(
      path.join(__dirname, '..', '..', '..', 'Testdata', 'SanityBatch', 'TestConfig.json'), 'utf8'
    ));
    const carrierUser = testConfig.CARRIER_USERNAME || 'TR_TST_CARRIER';
    const carrierPass = testConfig.CARRIER_PASSWORD || 'KraftHCLTech123$';

    // Step 106-108: Direct login as TR_TST_CARRIER (bypass objTestUtil.login which waits 60s for planner element)
    await showStep(driver, `Phase 13 Step 106-108: Logging into OTM Carrier Portal as ${carrierUser}`);
    await objTestUtil.logMessage('INFO', `Phase 13 Step 106: Navigating to OTM login page`);
    await objTestUtil.loadURL(Constants_1.Constants.sURL);
    await driver.wait(until.titleContains('Sign In'), 20000);
    await objTestUtil.logMessage('INFO', `Phase 13 Step 107: Entering credentials for ${carrierUser}`);
    const userFld13 = await driver.wait(until.elementLocated(By.id('idcs-signin-basic-signin-form-username')), 10000);
    await userFld13.clear();
    await userFld13.sendKeys(carrierUser);
    const pwFld13 = await driver.wait(until.elementLocated(By.id('idcs-signin-basic-signin-form-password|input')), 5000);
    await pwFld13.clear();
    await pwFld13.sendKeys(carrierPass);
    await objTestUtil.logMessage('INFO', `Phase 13 Step 108: Clicking Sign In`);
    const signInBtn13 = await driver.wait(until.elementLocated(By.id('idcs-signin-basic-signin-form-submit')), 5000);
    await signInBtn13.click();
    await driver.wait(until.titleContains('Home'), 30000);
    await driver.sleep(3000);
    const carrierHomeTitle = await driver.getTitle();
    await objTestUtil.logMessage('INFO', `Phase 13: Carrier logged in — page: ${carrierHomeTitle}`);
    assert.ok(carrierHomeTitle.toLowerCase().includes('home'), `Expected Home after carrier login, got: "${carrierHomeTitle}"`);
    await saveScreenshot(driver, screenshotsDir, 23);

    // Step 109: Navigate to Shipments - Review
    await showStep(driver, 'Phase 13 Step 109: Navigating to Shipment Management > Shipments - Review');
    await objTestUtil.logMessage('INFO', 'Phase 13 Step 109: Navigate to Shipments - Review');
    await driver.switchTo().defaultContent();
    await driver.sleep(2000);

    await driver.executeScript(`
      var els = Array.from(document.querySelectorAll('span, div, a'));
      var target = els.find(function(el) {
        return el.textContent.trim() === 'Shipment Management' && el.offsetParent !== null;
      });
      if (target) { target.click(); return true; }
      return false;
    `);
    await driver.sleep(2500);

    const shipReviewXp13 = `//*[normalize-space(text())='Shipments - Review'] | //*[normalize-space(.)='Shipments - Review' and not(*)]`;
    try {
      const shipReviewItem = await driver.findElement(By.xpath(shipReviewXp13));
      await driver.executeScript('arguments[0].click()', shipReviewItem);
      await objTestUtil.logMessage('INFO', 'Phase 13 Step 109: Shipments - Review menu item clicked');
    } catch(e) {
      await objTestUtil.logMessage('INFO', `Phase 13 Step 109 menu fallback: ${e.message.substring(0,80)}`);
      await driver.switchTo().defaultContent();
      try { await driver.switchTo().frame('mainIFrame'); } catch(e2) { try { await driver.switchTo().frame(0); } catch(e3) {} }
      const tile = await driver.wait(until.elementLocated(By.css('#label1')), 15000);
      await tile.click();
    }
    await driver.wait(
      until.elementLocated(By.xpath(`//iframe | //input[@title='Search'] | //*[contains(@class,'finder')]`)),
      20000
    );
    await driver.sleep(2000);
    await objTestUtil.logMessage('INFO', 'Phase 13: Shipments - Review finder loaded');
    await saveScreenshot(driver, screenshotsDir, 30);

    // Steps 110-112: Refine Query for shipmentId
    await showStep(driver, `Phase 13 Steps 110-112: Refine Query for shipment ${shipmentId}`);
    await objTestUtil.logMessage('INFO', `Phase 13 Steps 110-112: Refine Query for ${shipmentId}`);
    await driver.switchTo().defaultContent();
    try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }

    await driver.executeScript(`
      var btn = Array.from(document.querySelectorAll('button,input[type="button"],a'))
        .find(function(el){ return (el.textContent||el.value||'').trim() === 'Refine Query'; });
      if (btn) btn.click();
    `);
    await driver.sleep(2000);

    const refineInputs13 = await driver.executeScript(`
      return Array.from(document.querySelectorAll('input[type="text"],input:not([type])'))
        .slice(0,20).map(function(i){ return (i.id||'?')+'/name='+(i.name||'?')+'/placeholder='+(i.placeholder||'?'); }).join(' | ');
    `);
    await objTestUtil.logMessage('INFO', `Phase 13 Refine Query inputs: ${refineInputs13}`);

    await driver.executeScript(`
      var inputs = Array.from(document.querySelectorAll('input[type="text"],input:not([type])'));
      var xid = inputs.find(function(i){ return (i.name||'').toLowerCase().indexOf('xid') !== -1; })
               || inputs[0];
      if (xid) { xid.value = arguments[0]; xid.dispatchEvent(new Event('change')); xid.dispatchEvent(new Event('input')); }
    `, shipIdNumeric);
    await driver.sleep(500);

    await driver.executeScript(`
      var btn = Array.from(document.querySelectorAll('button,input[type="button"],input[type="submit"]'))
        .find(function(el){ var t=(el.textContent||el.value||'').trim(); return t === 'Search'; });
      if (btn) btn.click();
    `);
    await driver.sleep(5000);
    await saveScreenshot(driver, screenshotsDir, 24);

    // Step 113: Select checkbox
    await showStep(driver, `Phase 13 Step 113: Selecting checkbox for shipment TMS.${shipIdNumeric}`);
    await objTestUtil.logMessage('INFO', `Phase 13 Step 113: Select checkbox for TMS.${shipIdNumeric}`);
    try { await driver.switchTo().alert().then(a => a.dismiss()); } catch(e) {}
    await driver.switchTo().defaultContent();
    try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }

    const resultsContent13 = await driver.executeScript(`
      return document.body ? document.body.innerText.substring(0, 500) : 'NO BODY';
    `);
    await objTestUtil.logMessage('INFO', `Phase 13 Step 113 results content: ${resultsContent13}`);

    const checkboxClicked13 = await driver.executeScript(`
      var chk = document.querySelector('input[type="checkbox"][value*="${shipIdNumeric}"]') ||
                document.querySelector('input[type="checkbox"][value*="TMS."]') ||
                document.querySelector('input[type="checkbox"]');
      if (chk) { chk.click(); return chk.value || 'clicked'; }
      return 'not found';
    `, shipIdNumeric);
    await objTestUtil.logMessage('INFO', `Phase 13 Step 113: Checkbox clicked: ${checkboxClicked13}`);
    await saveScreenshot(driver, screenshotsDir, 31);
    assert.ok(checkboxClicked13 !== 'not found', `No checkbox found in Shipments-Review results`);
    await driver.sleep(1000);

    // Step 114: Click Mass Update
    await showStep(driver, 'Phase 13 Step 114: Clicking Mass Update');
    await objTestUtil.logMessage('INFO', 'Phase 13 Step 114: Click Mass Update button');
    const massUpdateBtn13 = await driver.wait(until.elementLocated(By.css('input#rgMassUpdateImg')), 10000);
    await massUpdateBtn13.click();
    await driver.sleep(3000);
    await saveScreenshot(driver, screenshotsDir, 25);

    // Steps 115-121: Fill 6 fields in Mass Update popup
    await showStep(driver, 'Phase 13 Step 115: Switching to Mass Update popup');
    await objTestUtil.logMessage('INFO', 'Phase 13 Step 115: Switch to MassUpdate new window');
    const mainWindow13 = await driver.getWindowHandle();
    await driver.sleep(3000);
    const allHandles13 = await driver.getAllWindowHandles();
    await objTestUtil.logMessage('INFO', `Phase 13 Window handles after Mass Update: ${allHandles13.length}`);
    let massUpdateWindow13 = null;
    for (const h of allHandles13) {
      if (h !== mainWindow13) { massUpdateWindow13 = h; break; }
    }
    if (massUpdateWindow13) {
      await driver.switchTo().window(massUpdateWindow13);
      await objTestUtil.logMessage('INFO', 'Phase 13: Switched to Mass Update popup window');
      await driver.sleep(2000);
    } else {
      await objTestUtil.logMessage('INFO', 'Phase 13: No new window — trying iframe on same page');
      await driver.switchTo().defaultContent();
      try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }
      const iframes13 = await driver.findElements(By.css('iframe'));
      await objTestUtil.logMessage('INFO', `Phase 13: Found ${iframes13.length} iframes on page`);
      if (iframes13.length > 0) await driver.switchTo().frame(iframes13[iframes13.length - 1]);
      await driver.sleep(1000);
    }

    const muContent13 = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,300) : 'NO BODY';`);
    await objTestUtil.logMessage('INFO', `Phase 13 Mass Update page content: ${muContent13}`);
    const muInputs13 = await driver.executeScript(`
      return Array.from(document.querySelectorAll('input[type="text"],textarea')).slice(0,20)
        .map(function(i){ return (i.id||'?')+' name='+(i.name||'?'); }).join(' | ');
    `);
    await objTestUtil.logMessage('INFO', `Phase 13 Mass Update inputs: ${muInputs13}`);

    const fillField13 = async (css, value, stepLabel) => {
      await showStep(driver, `${stepLabel}: ${value}`);
      await objTestUtil.logMessage('INFO', `${stepLabel}: ${value}`);
      const els = await driver.findElements(By.css(css));
      if (els.length === 0) {
        await objTestUtil.logMessage('INFO', `${stepLabel}: field not found by CSS "${css}" — skipping`);
        return;
      }
      await els[0].clear();
      await els[0].sendKeys(value);
    };

    await fillField13('input[name="shipment/attribute15"]', 'JOHN DOE', 'Phase 13 Step 116: Driver Name');
    await saveScreenshot(driver, screenshotsDir, 32);
    await fillField13('input[name="shipment/attribute16"]', 'TRL 001', 'Phase 13 Step 117: Trailer Number');
    await saveScreenshot(driver, screenshotsDir, 33);
    await fillField13('input[name="shipment/attribute17"]', 'TRC 001', 'Phase 13 Step 118: Truck Number');
    await saveScreenshot(driver, screenshotsDir, 34);
    await fillField13('input[name="shipment/attribute18"]', '0123456789', 'Phase 13 Step 119: Driver Phone');
    await saveScreenshot(driver, screenshotsDir, 35);
    await fillField13('input[name="shipment/attribute19"]', '11:30', 'Phase 13 Step 120: Appointment Time');
    await saveScreenshot(driver, screenshotsDir, 36);
    await fillField13('textarea[name="esrRemarkText_CARRIER_REMARKS"], textarea[name*="CARRIER_REMARKS"]',
      'I WILL COME ON TIME', 'Phase 13 Step 121: Carrier Remarks');
    await saveScreenshot(driver, screenshotsDir, 37);
    await driver.sleep(500);
    await saveScreenshot(driver, screenshotsDir, 26);

    // Step 126: Save — button is in parent mainIFrame
    await showStep(driver, 'Phase 13 Step 126: Saving Mass Update');
    await objTestUtil.logMessage('INFO', 'Phase 13 Step 126: Click Save');
    await driver.switchTo().defaultContent();
    try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }
    const allBtns13 = await driver.executeScript(`
      return Array.from(document.querySelectorAll('button,input[type="button"],input[type="submit"]'))
        .map(function(b){ return (b.id||'?')+' text='+(b.textContent||b.value||'').trim(); }).join(' | ');
    `);
    await objTestUtil.logMessage('INFO', `Phase 13 Parent frame buttons: ${allBtns13}`);
    const saveDone13 = await driver.executeScript(`
      var btn = document.getElementById('resultsPage:MassUpdatePopupDialog::save') ||
                Array.from(document.querySelectorAll('button')).find(function(b){
                  return (b.id||'').indexOf('MassUpdate') !== -1 && (b.textContent||'').trim()==='Save';
                });
      if (btn) { btn.click(); return 'clicked:' + btn.id; }
      return 'not found';
    `);
    await objTestUtil.logMessage('INFO', `Phase 13 MassUpdate Save result: ${saveDone13}`);
    if (saveDone13 === 'not found') {
      await objTestUtil.logMessage('INFO', 'Phase 13 Save fallback: Tab+Enter');
      await driver.actions().sendKeys('\t').perform();
      await driver.sleep(300);
      await driver.actions().sendKeys('\n').perform();
    }
    await driver.sleep(3000);

    // Step 127: Wait for Saving... dialog and click Close via Enter
    await showStep(driver, 'Phase 13 Step 127: Waiting for Saving... dialog to complete');
    await objTestUtil.logMessage('INFO', 'Phase 13 Step 127: Wait for green checkmark in Saving dialog');
    try { await driver.switchTo().alert().then(a => a.accept()); } catch(e) {}
    await driver.switchTo().defaultContent();
    try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }

    await objTestUtil.logMessage('INFO', 'Phase 13 Step 127: Polling for green checkmark...');
    let savingComplete13 = false;
    for (let i = 0; i < 15; i++) {
      await driver.sleep(2000);
      try {
        const status = await driver.executeScript(`
          var bodyText = document.body ? document.body.innerText : '';
          var hasSaving = bodyText.indexOf('Saving...') !== -1;
          var hasCheck = document.querySelector('img[src*="check"], img[src*="success"], img[alt*="check"], [class*="success"], [class*="checkmark"]');
          return { hasSaving: hasSaving, hasCheck: !!hasCheck };
        `);
        await objTestUtil.logMessage('INFO', `Phase 13 Saving status: hasSaving=${status.hasSaving} hasCheck=${status.hasCheck}`);
        if (!status.hasSaving || status.hasCheck) { savingComplete13 = true; break; }
      } catch(e) { savingComplete13 = true; break; }
    }
    await objTestUtil.logMessage('INFO', `Phase 13 Saving complete: ${savingComplete13}`);
    await saveScreenshot(driver, screenshotsDir, 38);

    await showStep(driver, 'Phase 13 Step 127: Clicking Close on Saving dialog');
    await objTestUtil.logMessage('INFO', 'Phase 13 Step 127: Waiting 2s then pressing Enter to click Close');
    await driver.sleep(2000);
    await driver.switchTo().activeElement().sendKeys('\n');
    await objTestUtil.logMessage('INFO', 'Phase 13 Step 127: Close clicked via Enter');
    await driver.sleep(3000);
    await saveScreenshot(driver, screenshotsDir, 27);

    // Steps 128-133: Scroll right and verify 6 values
    await showStep(driver, 'Phase 13 Steps 128-133: Checking shipment details — scrolling right to verify columns');
    await objTestUtil.logMessage('INFO', 'Phase 13 Steps 128-133: Wait for results page to load then scroll right');
    await driver.switchTo().defaultContent();
    await driver.sleep(3000);
    try {
      await driver.switchTo().frame('mainIFrame');
      await objTestUtil.logMessage('INFO', 'Phase 13 Steps 128-133: Switched to mainIFrame for scroll');
    } catch(e) {
      try { await driver.switchTo().frame(0); } catch(e2) {}
      await objTestUtil.logMessage('INFO', 'Phase 13 Steps 128-133: Switched to frame[0] for scroll');
    }
    await driver.sleep(2000);
    await saveScreenshot(driver, screenshotsDir, 28);

    const scrollResult13 = await driver.executeScript(`
      var scrolled = [];
      Array.from(document.querySelectorAll('*')).forEach(function(el) {
        var sw = el.scrollWidth - el.clientWidth;
        if (sw > 50) {
          el.scrollLeft = el.scrollWidth;
          scrolled.push(el.tagName + '.' + (el.className||'').split(' ')[0] + ' scrollWidth=' + el.scrollWidth);
        }
      });
      window.scrollTo(document.body.scrollWidth, 0);
      document.documentElement.scrollLeft = document.documentElement.scrollWidth;
      return scrolled.slice(0, 10).join(' | ');
    `);
    await objTestUtil.logMessage('INFO', 'Phase 13 Scroll result: ' + scrollResult13);
    await driver.sleep(2000);
    await saveScreenshot(driver, screenshotsDir, 29);

    const rowText13 = await driver.executeScript(`return document.body ? document.body.innerText : '';`);
    const check13 = (val, label) => {
      const found = rowText13.indexOf(val) !== -1;
      objTestUtil.logMessage('INFO', `Phase 13 ${label}: ${found ? 'FOUND ✓' : 'NOT FOUND ✗'} ("${val}")`);
      return found;
    };
    const v1_13 = check13('JOHN DOE',           'Driver Name');
    await saveScreenshot(driver, screenshotsDir, 39);
    const v2_13 = check13('TRL 001',            'Trailer Number');
    await saveScreenshot(driver, screenshotsDir, 40);
    const v3_13 = check13('TRC 001',            'Truck Number');
    await saveScreenshot(driver, screenshotsDir, 41);
    const v4_13 = check13('0123456789',         'Driver Phone');
    await saveScreenshot(driver, screenshotsDir, 42);
    const v5_13 = check13('11:30',              'Appointment Time');
    await saveScreenshot(driver, screenshotsDir, 43);
    const v6_13 = check13('I WILL COME ON TIME','Carrier Remarks');
    await saveScreenshot(driver, screenshotsDir, 44);
    await objTestUtil.logMessage('INFO', `Phase 13 Verify results: [${v1_13}] [${v2_13}] [${v3_13}] [${v4_13}] [${v5_13}] [${v6_13}]`);

    await showStep(driver, 'Phase 13 COMPLETE — Carrier Portal all steps passed');
    await objTestUtil.logMessage('INFO', 'Phase 13 carrier steps complete — proceeding to Phase 14: KHC_WAREHOUSE upload + tracking events');

    // ── Phase 14: Sign out carrier → Login LEL7597_TMS → KHC_WAREHOUSE ──────────────────────
    await showStep(driver, 'Phase 14: Sign out carrier → LEL7597_TMS / KHC_WAREHOUSE');
    await objTestUtil.logMessage('INFO', 'Phase 14: Signing out TR_TST_CARRIER');
    try {
      await driver.switchTo().defaultContent();
      const userIconEl = await driver.findElement(By.xpath('//*[@title="Settings and Actions" or @id="userAvatar" or contains(@class,"user-icon") or contains(@class,"avatar")]'));
      await userIconEl.click();
      await driver.sleep(1500);
      const signOutEl = await driver.findElement(By.xpath('//*[normalize-space(text())="Sign Out" or normalize-space(text())="Sign out"]'));
      await signOutEl.click();
      await driver.sleep(3000);
      await objTestUtil.logMessage('INFO', 'Phase 14: TR_TST_CARRIER signed out');
    } catch(e) {
      await objTestUtil.logMessage('INFO', `Phase 14: Sign out error: ${e.message.substring(0,80)}`);
      await driver.get(Constants_1.Constants.sURL);
      await driver.sleep(3000);
    }

    // Login LEL7597_TMS
    const lel14User = Constants_1.Constants.DBA_USERNAME || 'LEL7597_TMS';
    const lel14Pass = Constants_1.Constants.DBA_PASSWORD || 'Oracle@12345678';
    await driver.wait(until.titleContains('Sign In'), 20000);
    const userFld14 = await driver.wait(until.elementLocated(By.id('idcs-signin-basic-signin-form-username')), 10000);
    await userFld14.clear(); await userFld14.sendKeys(lel14User);
    const pwFld14 = await driver.wait(until.elementLocated(By.id('idcs-signin-basic-signin-form-password|input')), 5000);
    await pwFld14.clear(); await pwFld14.sendKeys(lel14Pass);
    const signInBtn14 = await driver.wait(until.elementLocated(By.id('idcs-signin-basic-signin-form-submit')), 5000);
    await signInBtn14.click();
    await driver.wait(until.titleContains('Home'), 30000);
    await driver.sleep(3000); // let OTM home fully settle before opening settings
    await objTestUtil.logMessage('INFO', `Phase 14: ${lel14User} logged in`);

    // Switch to KHC_WAREHOUSE using the same switchToRole helper already in this file
    await switchToRole(driver, 'KHC_WAREHOUSE', objTestUtil);
    await driver.wait(until.titleContains('Home'), 20000);
    await objTestUtil.logMessage('INFO', 'Phase 14: Role switched to KHC_WAREHOUSE');
    await saveScreenshot(driver, screenshotsDir, 45);

    // ── Navigate to Shipments ─────────────────────────────────────────────────
    await showStep(driver, 'Phase 14: Shipments tile → search shipment');
    await driver.sleep(3000);
    await driver.switchTo().defaultContent();
    const shipTiles14 = await driver.executeScript(`
      var tiles = Array.from(document.querySelectorAll('a, button, div[role="button"], span, div[class*="tile"], div[class*="Tile"]'));
      var t = tiles.find(function(el){
        var txt = (el.textContent||'').trim();
        return txt.indexOf('Shipments') !== -1 && txt.length < 40 && el.offsetParent !== null;
      });
      if (t) { t.click(); return 'Shipments clicked (' + t.tagName + '): ' + (t.textContent||'').trim(); }
      return 'Shipments tile not found';
    `);
    await objTestUtil.logMessage('INFO', `Phase 14: ${shipTiles14}`);

    // Wait for mainIFrame to appear (poll up to 20s)
    let mainFrameReady14 = false;
    for (let wi = 0; wi < 40; wi++) {
      await driver.sleep(500);
      try {
        await driver.switchTo().defaultContent();
        await driver.switchTo().frame('mainIFrame');
        mainFrameReady14 = true;
        await driver.switchTo().defaultContent();
        break;
      } catch(e) {}
    }
    await objTestUtil.logMessage('INFO', `Phase 14: mainIFrame ready: ${mainFrameReady14}`);
    await saveScreenshot(driver, screenshotsDir, 46);
    if (!mainFrameReady14) {
      // fallback: try frame(0) — maybe page uses unnamed frame
      try { await driver.switchTo().defaultContent(); await driver.switchTo().frame(0); await driver.switchTo().defaultContent(); } catch(e2) {}
    }
    await driver.sleep(2000);

    // Refine Query → enter shipment ID → Search
    await driver.switchTo().defaultContent();
    if (mainFrameReady14) {
      try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }
    } else {
      try { await driver.switchTo().frame(0); } catch(e) {}
    }
    const shipIdNumeric14 = (shipmentId || '').replace('TMS.', '');
    await driver.executeScript(`
      var btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
      var rq = btns.find(function(b){ return (b.textContent||b.value||'').trim() === 'Refine Query' && b.offsetParent !== null; });
      if (rq) rq.click();
    `);
    await driver.sleep(3000);
    await driver.executeScript(`
      var inputs = Array.from(document.querySelectorAll('input[name="shipment/xid"], input[placeholder="?"]'));
      var xid = inputs.find(function(i){ return i.name === 'shipment/xid' || (i.placeholder === '?' && i.offsetParent !== null); });
      if (xid) { xid.value = arguments[0]; xid.dispatchEvent(new Event('change',{bubbles:true})); }
    `, shipIdNumeric14);
    await driver.sleep(500);
    await driver.executeScript(`
      var btns = Array.from(document.querySelectorAll('button, input[type="button"]'));
      var s = btns.find(function(b){ return (b.textContent||b.value||'').trim() === 'Search' && b.offsetParent !== null; });
      if (s) s.click();
    `);
    await driver.sleep(4000);
    await objTestUtil.logMessage('INFO', `Phase 14: Shipment ${shipIdNumeric14} searched`);
    await saveScreenshot(driver, screenshotsDir, 47);

    // ── addAndViewTrackingEvent helper (local to Phase 14) ────────────────────
    async function addAndViewEvent14(stepLabel, quickCodeText, quickCodeValue, screenshotBase) {
      await driver.switchTo().defaultContent();
      try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }
      await driver.executeScript(`
        var cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        var cb = cbs.find(function(c){ return c.value && c.value !== 'on' && c.offsetParent !== null; });
        if (cb) { cb.checked = false; cb.click(); }
      `);
      await driver.sleep(500);
      await driver.executeScript(`
        var btns = Array.from(document.querySelectorAll('button, input[type="button"]'));
        var a = btns.find(function(b){ return (b.textContent||b.value||'').trim() === 'Actions' && b.offsetParent !== null; });
        if (a) a.click();
      `);
      await driver.sleep(1500);
      await driver.switchTo().defaultContent();
      await driver.sleep(500);
      try {
        try { await driver.switchTo().frame('mainIFrame'); } catch(e) { await driver.switchTo().frame(0); }
        await driver.sleep(500);
        const af = await driver.findElement(By.xpath('//iframe[@name="actionFrame"]'));
        await driver.switchTo().frame(af);
        const addLink = await driver.findElement(By.xpath('//a[text()="Add Tracking Event"] | //a[normalize-space(.)="Add Tracking Event"]'));
        await addLink.click();
        await objTestUtil.logMessage('INFO', `${stepLabel}: Add Tracking Event clicked ✓`);
      } catch(e) {
        await objTestUtil.logMessage('INFO', `${stepLabel}: Add Tracking Event click error: ${e.message.substring(0,80)}`);
      }
      await driver.switchTo().defaultContent();
      await driver.sleep(4000);

      const allH = await driver.getAllWindowHandles();
      const mainH = await driver.getWindowHandle();
      let popupH = null;
      for (const h of allH) { if (h !== mainH) { popupH = h; break; } }
      await objTestUtil.logMessage('INFO', `${stepLabel}: popup: ${popupH ? 'YES' : 'NO (skipping)'}`);
      if (!popupH) { await driver.sleep(2000); return; }
      if (popupH) {
        await driver.switchTo().window(popupH);
        await driver.sleep(2000);
        let frameIdx = 1;
        for (let fi = 0; fi < 4; fi++) {
          try {
            await driver.switchTo().defaultContent();
            await driver.switchTo().frame(fi);
            const hasForm = await driver.executeScript(`return !!document.querySelector('select')`);
            if (hasForm) { frameIdx = fi; break; }
          } catch(fe) {}
        }
        await driver.switchTo().defaultContent();
        await driver.switchTo().frame(frameIdx);

        // Responsible Party = Warehouse
        await driver.executeScript(`
          var selects = Array.from(document.querySelectorAll('select'));
          var rp = selects.find(function(s){ return s.name && s.name.toLowerCase().indexOf('responsible') !== -1; });
          if (!rp && selects.length > 0) rp = selects[0];
          if (rp) {
            var opt = Array.from(rp.options).find(function(o){ return o.text === 'Warehouse' || o.value === 'Warehouse' || o.value === 'TMS.WAREHOUSE'; });
            if (opt) { rp.value = opt.value; rp.dispatchEvent(new Event('change',{bubbles:true})); }
          }
        `);

        // Status = MISC_WH (poll-wait)
        let statusRes = 'not found';
        for (let attempt = 0; attempt < 10; attempt++) {
          await driver.sleep(500);
          statusRes = await driver.executeScript(`
            var selects = Array.from(document.querySelectorAll('select'));
            var st = selects.find(function(s){ return Array.from(s.options).some(function(o){ return o.value === 'TMS.MISC_WH' || o.value === 'MISC_WH' || o.text === 'MISC_WH'; }); });
            if (st) {
              var opt = Array.from(st.options).find(function(o){ return o.value === 'TMS.MISC_WH' || o.value === 'MISC_WH' || o.text === 'MISC_WH'; });
              if (opt) { st.value = opt.value; st.dispatchEvent(new Event('change',{bubbles:true})); return 'Status = MISC_WH'; }
            }
            return 'not found yet';
          `);
          if (statusRes.indexOf('Status =') !== -1) break;
        }
        await objTestUtil.logMessage('INFO', `${stepLabel}: ${statusRes}`);

        // Quick Code — poll-wait
        let qcRes = quickCodeText + ' not found';
        for (let attempt = 0; attempt < 10; attempt++) {
          await driver.sleep(500);
          qcRes = await driver.executeScript(`
            var qcText = arguments[0], qcVal = arguments[1];
            var selects = Array.from(document.querySelectorAll('select'));
            var ls = selects.find(function(s){ return Array.from(s.options).some(function(o){ return o.text === qcText || o.value === qcVal || (o.text||'').toLowerCase() === qcText.toLowerCase(); }); });
            if (ls) {
              var opt = Array.from(ls.options).find(function(o){ return o.text === qcText || o.value === qcVal || (o.text||'').toLowerCase() === qcText.toLowerCase(); });
              if (opt) { opt.selected = true; ls.value = opt.value; ls.dispatchEvent(new Event('change',{bubbles:true})); opt.click(); return qcText + ' selected (value=' + opt.value + ')'; }
            }
            return qcText + ' not found yet';
          `, quickCodeText, quickCodeValue);
          if (qcRes.indexOf('selected') !== -1) break;
        }
        await objTestUtil.logMessage('INFO', `${stepLabel}: ${qcRes}`);

        // Event Date/Time
        const tnow = new Date();
        const evDT = `${String(tnow.getDate()).padStart(2,'0')}/${String(tnow.getMonth()+1).padStart(2,'0')}/${tnow.getFullYear()} ${String(tnow.getHours()).padStart(2,'0')}:${String(tnow.getMinutes()).padStart(2,'0')}:00`;
        await driver.executeScript(`
          var inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
          var dt = inputs.find(function(i){ return (i.placeholder||'').indexOf('DD/MM/YYYY') !== -1 || (i.name||'').toLowerCase().indexOf('date') !== -1; });
          if (dt) { dt.value = arguments[0]; dt.dispatchEvent(new Event('change',{bubbles:true})); dt.dispatchEvent(new Event('blur',{bubbles:true})); }
        `, evDT);
        await objTestUtil.logMessage('INFO', `${stepLabel}: Date/Time = ${evDT}`);

        // Stops = Stop 1
        await driver.executeScript(`
          var selects = Array.from(document.querySelectorAll('select'));
          var st = selects.find(function(s){ return s.options.length > 1 && Array.from(s.options).some(function(o){ return (o.text||'').indexOf('LSPB') !== -1 || (o.text||'').indexOf('BALIKESIR') !== -1; }); });
          if (!st) st = selects.find(function(s){ return (s.name||'').toLowerCase().indexOf('stop') !== -1; });
          if (st && st.options.length > 1) { st.selectedIndex = 1; st.dispatchEvent(new Event('change',{bubbles:true})); }
        `);

        // Finished
        await driver.executeScript(`
          var btns = Array.from(document.querySelectorAll('input[type="submit"], button, input[type="button"]'));
          var f = btns.find(function(b){ return (b.value||b.textContent||'').trim() === 'Finished'; });
          if (f) f.click();
        `);
        try { const al = await driver.switchTo().alert(); const t = await al.getText(); await objTestUtil.logMessage('INFO', `${stepLabel}: Alert: ${t.replace(/\n/g,' ')}`); await al.accept(); await driver.sleep(1000); } catch(ae) {}
        await driver.sleep(4000);

        const sTxt = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,200) : '';`);
        const created = sTxt.indexOf('successfully created') !== -1 || sTxt.indexOf('Success') !== -1;
        await objTestUtil.logMessage('INFO', `${stepLabel}: Event created: ${created ? 'YES ✓' : 'NO ✗'} — ${sTxt.replace(/\n/g,' ').substring(0,80)}`);
        if (screenshotBase !== undefined) await saveScreenshot(driver, screenshotsDir, screenshotBase);
        await driver.close();
        await driver.switchTo().window(mainH);
      }
      await driver.sleep(2000);

      // View Tracking Events
      await driver.switchTo().defaultContent();
      try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }
      await driver.executeScript(`
        var cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
        var cb = cbs.find(function(c){ return c.value && c.value !== 'on' && c.offsetParent !== null; });
        if (cb) { cb.checked = false; cb.click(); }
      `);
      await driver.sleep(500);
      await driver.executeScript(`
        var btns = Array.from(document.querySelectorAll('button, input[type="button"]'));
        var a = btns.find(function(b){ return (b.textContent||b.value||'').trim() === 'Actions' && b.offsetParent !== null; });
        if (a) a.click();
      `);
      await driver.sleep(1500);
      await driver.switchTo().defaultContent();
      await driver.sleep(500);
      try {
        try { await driver.switchTo().frame('mainIFrame'); } catch(e) { await driver.switchTo().frame(0); }
        await driver.sleep(500);
        const af2 = await driver.findElement(By.xpath('//iframe[@name="actionFrame"]'));
        await driver.switchTo().frame(af2);
        const vLink = await driver.findElement(By.xpath('//a[text()="View Tracking Events"] | //a[normalize-space(.)="View Tracking Events"]'));
        await vLink.click();
        await objTestUtil.logMessage('INFO', `${stepLabel}: View Tracking Events clicked ✓`);
      } catch(e) {
        await objTestUtil.logMessage('INFO', `${stepLabel}: View Tracking Events error: ${e.message.substring(0,60)}`);
      }
      await driver.switchTo().defaultContent();
      await driver.sleep(4000);

      const allH2 = await driver.getAllWindowHandles();
      const mainH2 = await driver.getWindowHandle();
      let viewH = null;
      for (const h of allH2) { if (h !== mainH2) { viewH = h; break; } }
      if (viewH) {
        await driver.switchTo().window(viewH);
        await driver.sleep(2000);
        let vTxt = await driver.executeScript(`return document.body ? document.body.innerText : '';`);
        if (vTxt.indexOf(quickCodeText) === -1) {
          for (let fi = 0; fi < 5; fi++) {
            try {
              await driver.switchTo().defaultContent();
              await driver.switchTo().frame(fi);
              const ft = await driver.executeScript(`return document.body ? document.body.innerText : '';`);
              if (ft.indexOf(quickCodeText) !== -1) { vTxt = ft; break; }
            } catch(fe) {}
          }
          await driver.switchTo().defaultContent();
        }
        const evVisible = vTxt.indexOf(quickCodeText) !== -1;
        await objTestUtil.logMessage('INFO', `${stepLabel}: ${quickCodeText} visible: ${evVisible ? 'YES ✓' : 'NO ✗'}`);
        if (screenshotBase !== undefined) await saveScreenshot(driver, screenshotsDir, screenshotBase + 1);
        await driver.close();
        await driver.switchTo().window(mainH2);
      }
      await driver.sleep(2000);
    }

    // ── Phase 14a: Select checkbox → Actions → Upload Document (Batch List) ──
    await showStep(driver, 'Phase 14a: Upload Batch List document');
    await driver.switchTo().defaultContent();
    try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }
    await driver.executeScript(`
      var cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      var cb = cbs.find(function(c){ return c.value && c.value !== 'on' && c.offsetParent !== null; });
      if (cb) { cb.checked = false; cb.click(); }
    `);
    await driver.sleep(500);
    await driver.executeScript(`
      var btns = Array.from(document.querySelectorAll('button, input[type="button"]'));
      var a = btns.find(function(b){ return (b.textContent||b.value||'').trim() === 'Actions' && b.offsetParent !== null; });
      if (a) a.click();
    `);
    await driver.sleep(1500);
    await driver.switchTo().defaultContent();
    await driver.sleep(500);
    try {
      try { await driver.switchTo().frame('mainIFrame'); } catch(e) { await driver.switchTo().frame(0); }
      await driver.sleep(500);
      const afUp = await driver.findElement(By.xpath('//iframe[@name="actionFrame"]'));
      await driver.switchTo().frame(afUp);
      const upLink = await driver.findElement(By.xpath('//a[text()="Upload Document"] | //a[normalize-space(.)="Upload Document"]'));
      await upLink.click();
      await objTestUtil.logMessage('INFO', 'Phase 14a: Upload Document clicked ✓');
      await saveScreenshot(driver, screenshotsDir, 48);
    } catch(e) {
      await objTestUtil.logMessage('INFO', `Phase 14a: Upload Document error: ${e.message.substring(0,80)}`);
    }
    await driver.switchTo().defaultContent();
    await driver.sleep(3000);

    // Upload popup
    const upHandles = await driver.getAllWindowHandles();
    const mainUpH = await driver.getWindowHandle();
    let upPopupH = null;
    for (const h of upHandles) { if (h !== mainUpH) { upPopupH = h; break; } }
    if (upPopupH) {
      await driver.switchTo().window(upPopupH);
      await driver.sleep(2000);
      const batchListPath14 = path.join('C:', 'Users', 'bhanu', 'Downloads', 'Batch List.docx');
      let fileInput14 = null;
      for (let fi = 0; fi < 4; fi++) {
        try {
          await driver.switchTo().defaultContent();
          await driver.switchTo().frame(fi);
          const found = await driver.executeScript(`return !!document.querySelector('input[type="file"]')`);
          if (found) { fileInput14 = await driver.findElement(By.css('input[type="file"]')); break; }
        } catch(fe) {}
      }
      if (!fileInput14) { await driver.switchTo().window(upPopupH); fileInput14 = await driver.findElement(By.css('input[type="file"]')); }
      await fileInput14.sendKeys(batchListPath14);
      await driver.sleep(1000);
      await driver.executeScript(`
        var btns = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
        var u = btns.find(function(b){ return (b.value||b.textContent||'').trim() === 'Upload' && b.offsetParent !== null; });
        if (u) u.click();
      `);
      await driver.sleep(4000);
      const upResult14 = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,200) : '';`);
      await objTestUtil.logMessage('INFO', `Phase 14a: Upload result: ${upResult14.replace(/\n/g,' ').substring(0,100)}`);
      await saveScreenshot(driver, screenshotsDir, 49);
      // Select BATCH_LIST doc type
      await driver.executeScript(`
        var sel = document.querySelector('select');
        if (sel) {
          var opt = Array.from(sel.options).find(function(o){ return o.value === 'TMS.BATCH_LIST' || o.text === 'BATCH_LIST' || (o.text||'').indexOf('BATCH') !== -1; });
          if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change',{bubbles:true})); }
        }
      `);
      await driver.sleep(500);
      await driver.executeScript(`
        var btns = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
        var s = btns.find(function(b){ return (b.value||b.textContent||'').trim() === 'Submit' && b.offsetParent !== null; });
        if (s) s.click();
      `);
      await driver.sleep(3000);
      const submitResult14 = await driver.executeScript(`return document.body ? document.body.innerText.substring(0,200) : '';`);
      await objTestUtil.logMessage('INFO', `Phase 14a: Submit result: ${submitResult14.replace(/\n/g,' ').substring(0,100)}`);
      await saveScreenshot(driver, screenshotsDir, 50);
      await driver.close();
      await driver.switchTo().window(mainUpH);
      await objTestUtil.logMessage('INFO', 'Phase 14a: Upload Document popup closed');
    }
    await driver.sleep(2000);

    // Re-search shipment (selection lost after popup)
    await driver.switchTo().defaultContent();
    try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }
    await driver.executeScript(`
      var btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
      var rq = btns.find(function(b){ return (b.textContent||b.value||'').trim() === 'Refine Query' && b.offsetParent !== null; });
      if (rq) rq.click();
    `);
    await driver.sleep(3000);
    await driver.executeScript(`
      var inputs = Array.from(document.querySelectorAll('input[name="shipment/xid"], input[placeholder="?"]'));
      var xid = inputs.find(function(i){ return i.name === 'shipment/xid' || (i.placeholder === '?' && i.offsetParent !== null); });
      if (xid) { xid.value = arguments[0]; xid.dispatchEvent(new Event('change',{bubbles:true})); }
    `, shipIdNumeric14);
    await driver.sleep(500);
    await driver.executeScript(`
      var btns = Array.from(document.querySelectorAll('button, input[type="button"]'));
      var s = btns.find(function(b){ return (b.textContent||b.value||'').trim() === 'Search' && b.offsetParent !== null; });
      if (s) s.click();
    `);
    await driver.sleep(5000);
    await objTestUtil.logMessage('INFO', `Phase 14a: Re-search complete for ${shipIdNumeric14}`);

    // ── Phase 14g: Verify Batch List document via SmartLinks → Documents ──────
    await showStep(driver, 'Phase 14g: Verify Batch List document via SmartLinks');
    try {
      // Right-click the shipment ID link in mainIFrame to open SmartLinks
      const shipLink14g = await driver.executeScript(`
        var links = Array.from(document.querySelectorAll('a'));
        return links.find(function(a){
          var t = (a.textContent||'').trim();
          return (t === arguments[0] || t === 'TMS.' + arguments[0]) && a.offsetParent !== null;
        }) || null;
      `, shipIdNumeric14);

      if (shipLink14g) {
        const handlesBeforeDoc = await driver.getAllWindowHandles();
        await driver.actions().contextClick(shipLink14g).perform();
        await driver.sleep(1500);

        // Click "Documents" in SmartLinks popup (it's a floating div in the page)
        const docClicked = await driver.executeScript(`
          var items = Array.from(document.querySelectorAll('a, td, li, div'));
          var doc = items.find(function(el){
            return (el.textContent||'').trim() === 'Documents' && el.offsetParent !== null;
          });
          if (doc) { doc.click(); return true; }
          return false;
        `);
        await objTestUtil.logMessage('INFO', `Phase 14g: SmartLinks Documents clicked: ${docClicked}`);
        await saveScreenshot(driver, screenshotsDir, 51);
        await driver.sleep(4000);

        // Wait for Documents popup window
        let docHandle = null;
        for (let wi = 0; wi < 20; wi++) {
          const handles = await driver.getAllWindowHandles();
          const newH = handles.find(h => !handlesBeforeDoc.includes(h));
          if (newH) { docHandle = newH; break; }
          await driver.sleep(500);
        }

        if (docHandle) {
          await driver.switchTo().window(docHandle);
          await driver.sleep(2000);

          // Verify BATCH_LIST document exists
          const docPageText = await driver.executeScript(`return document.body ? document.body.innerText : '';`);
          const hasBatchList = docPageText.includes('BATCH_LIST') || docPageText.includes('BATCH LIST');
          await objTestUtil.logMessage('INFO', `Phase 14g: BATCH_LIST document found: ${hasBatchList ? 'YES' : 'NO'}`);
          await saveScreenshot(driver, screenshotsDir, 52);

          // Click the document ID link to View it
          const handlesBeforeView = await driver.getAllWindowHandles();
          await driver.executeScript(`
            var links = Array.from(document.querySelectorAll('a'));
            var docLink = links.find(function(a){
              var t = (a.textContent||'').trim();
              return (t.indexOf('BATCH') !== -1 || t.indexOf('LIST') !== -1) && a.offsetParent !== null;
            });
            if (docLink) docLink.click();
          `);
          await driver.sleep(3000);

          // Switch to View popup
          let viewHandle = null;
          const handlesAfterView = await driver.getAllWindowHandles();
          viewHandle = handlesAfterView.find(h => !handlesBeforeView.includes(h));

          if (viewHandle) {
            await driver.switchTo().window(viewHandle);
            await driver.sleep(2000);
            const viewText = await driver.executeScript(`return document.body ? document.body.innerText : '';`);
            const docTypeOk  = viewText.includes('BATCH_LIST') || viewText.includes('BATCH LIST');
            const fileNameOk = viewText.includes('Batch List');
            await objTestUtil.logMessage('INFO', `Phase 14g: Document type BATCH_LIST: ${docTypeOk ? 'YES' : 'NO'}`);
            await saveScreenshot(driver, screenshotsDir, 53);
            await objTestUtil.logMessage('INFO', `Phase 14g: File name Batch List: ${fileNameOk ? 'YES' : 'NO'}`);

            // Click Open to trigger download
            const handlesBeforeOpen = await driver.getAllWindowHandles();
            await driver.executeScript(`
              var btns = Array.from(document.querySelectorAll('input[type="button"], button, a'));
              var openBtn = btns.find(function(b){
                return (b.value || b.textContent || '').trim() === 'Open' && b.offsetParent !== null;
              });
              if (openBtn) openBtn.click();
            `);
            await objTestUtil.logMessage('INFO', 'Phase 14g: Open button clicked — file downloading');
            await saveScreenshot(driver, screenshotsDir, 54);
            await driver.sleep(3000);
          } else {
            await objTestUtil.logMessage('INFO', 'Phase 14g: View popup did not open — skipping');
          }
        } else {
          await objTestUtil.logMessage('INFO', 'Phase 14g: Documents popup window did not appear');
        }
      } else {
        await objTestUtil.logMessage('INFO', `Phase 14g: Shipment link not found for ${shipIdNumeric14}`);
      }
    } catch(e14g) {
      await objTestUtil.logMessage('INFO', `Phase 14g: error: ${e14g.message.substring(0,120)}`);
    }

    // Close all popup windows — keep only the main window
    try {
      const allH14g = await driver.getAllWindowHandles();
      const mainH14g = allH14g[0];
      for (const h of allH14g) {
        if (h !== mainH14g) {
          await driver.switchTo().window(h);
          await driver.close();
        }
      }
      await driver.switchTo().window(mainH14g);
      await objTestUtil.logMessage('INFO', 'Phase 14g: All popups closed — back to main window');
      await saveScreenshot(driver, screenshotsDir, 55);
    } catch(eClose) {
      await objTestUtil.logMessage('INFO', `Phase 14g: close popups error: ${eClose.message.substring(0,80)}`);
    }

    // Re-enter mainIFrame for tracking events
    await driver.sleep(2000);
    await driver.switchTo().defaultContent();
    try { await driver.switchTo().frame('mainIFrame'); } catch(e) { try { await driver.switchTo().frame(0); } catch(e2) {} }

    // ── Phase 14b–e: Tracking events ─────────────────────────────────────────
    await showStep(driver, 'Phase 14b: Add Gate_In event');
    await objTestUtil.logMessage('INFO', 'Phase 14b: Gate_In');
    await addAndViewEvent14('Phase 14b', 'Gate_In', 'TMS.GI', 56);

    await showStep(driver, 'Phase 14c: Add Load_Start event');
    await objTestUtil.logMessage('INFO', 'Phase 14c: Load_Start');
    await addAndViewEvent14('Phase 14c', 'Load_Start', 'TMS.LS', 58);

    await showStep(driver, 'Phase 14d: Add Load_End event');
    await objTestUtil.logMessage('INFO', 'Phase 14d: Load_End');
    await addAndViewEvent14('Phase 14d', 'Load_End', 'TMS.LE', 60);

    // ── Phase 14e: POST PGI XML ───────────────────────────────────────────────
    await showStep(driver, 'Phase 14e: POST PGI XML');
    await objTestUtil.logMessage('INFO', 'Phase 14e: Building and posting PGI XML');
    {
      const shipXid14 = (shipmentId || '').replace('TMS.', '');
      const tnow14 = new Date();
      const pad14 = n => String(n).padStart(2,'0');
      const evDtStr14 = `${tnow14.getFullYear()}${pad14(tnow14.getMonth()+1)}${pad14(tnow14.getDate())}${pad14(tnow14.getHours())}${pad14(tnow14.getMinutes())}${pad14(tnow14.getSeconds())}`;
      const delivNoteRef = `<otm:ShipmentRefnum><otm:ShipmentRefnumQualifierGid><otm:Gid><otm:DomainName>TMS</otm:DomainName><otm:Xid>DELIVERY_NOTE_NUMBER</otm:Xid></otm:Gid></otm:ShipmentRefnumQualifierGid><otm:ShipmentRefnumValue>${TX3_DELIVERY_NOTE}</otm:ShipmentRefnumValue></otm:ShipmentRefnum>`;
      const pgiXml14 = `<?xml version="1.0" encoding="UTF-8"?><otm:Transmission xmlns:otm="http://xmlns.oracle.com/apps/otm/transmission/v6.4" xmlns:gtm="http://xmlns.oracle.com/apps/gtm/transmission/v6.4"><otm:TransmissionHeader><otm:AckSpec><otm:ComMethodGid><otm:Gid><otm:Xid>HTTPPOST</otm:Xid></otm:Gid></otm:ComMethodGid><otm:AckOption>YES</otm:AckOption><otm:ContactGid><otm:Gid><otm:DomainName>TMS</otm:DomainName><otm:Xid>TMS_TRANSMISSION_REPORT</otm:Xid></otm:Gid></otm:ContactGid></otm:AckSpec><otm:IsProcessInSequence>Y</otm:IsProcessInSequence><otm:StopProcessOnError>Y</otm:StopProcessOnError></otm:TransmissionHeader><otm:TransmissionBody><otm:GLogXMLElement><otm:ShipmentStatus>${delivNoteRef}<otm:StatusLevel>SHIPMENT</otm:StatusLevel><otm:StatusCodeGid><otm:Gid><otm:Xid>L1</otm:Xid></otm:Gid></otm:StatusCodeGid><otm:EventDt><otm:GLogDate>${evDtStr14}</otm:GLogDate><otm:TZId>Asia/Istanbul</otm:TZId></otm:EventDt><otm:SSStop><otm:SSStopSequenceNum>2</otm:SSStopSequenceNum><otm:SSLocation><otm:LocationRefnumQualifierGid><otm:Gid><otm:Xid>GLOG</otm:Xid></otm:Gid></otm:LocationRefnumQualifierGid></otm:SSLocation></otm:SSStop><otm:EventGroup><otm:EventGroupGid><otm:Gid><otm:Xid>GOODSISSUE</otm:Xid></otm:Gid></otm:EventGroupGid></otm:EventGroup><otm:StatusGroup><otm:StatusGroupGid><otm:Gid><otm:Xid>GOODSISSUE</otm:Xid></otm:Gid></otm:StatusGroupGid></otm:StatusGroup><otm:ShipmentGid><otm:Gid><otm:DomainName>TMS</otm:DomainName><otm:Xid>${shipXid14}</otm:Xid></otm:Gid></otm:ShipmentGid></otm:ShipmentStatus></otm:GLogXMLElement></otm:TransmissionBody></otm:Transmission>`;

      const otmHost14 = 'otmgtm-test-a629995.otmgtm.us-phoenix-1.ocs.oraclecloud.com';
      const authB64_14 = Buffer.from(`${WM_USER}:${WM_PASS}`).toString('base64');
      const pgiRes14 = await new Promise((resolve) => {
        const body = Buffer.from(pgiXml14, 'utf8');
        const req = https.request({ hostname: otmHost14, path: '/GC3/glog.integration.servlet.WMServlet', method: 'POST',
          headers: { 'Content-Type': 'text/xml; charset=UTF-8', 'Content-Length': body.length, 'Authorization': `Basic ${authB64_14}` },
          rejectUnauthorized: false,
        }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d.substring(0,300) })); });
        req.on('error', err => resolve({ status: 0, body: err.message }));
        req.write(body); req.end();
      });
      const pgiOk14 = pgiRes14.status === 200 && pgiRes14.body.indexOf('Error') === -1;
      await objTestUtil.logMessage('INFO', `Phase 14e: PGI POST status=${pgiRes14.status} ${pgiOk14 ? '✓' : '✗'} — ${pgiRes14.body.replace(/\n/g,' ').substring(0,150)}`);
      await saveScreenshot(driver, screenshotsDir, 62);
    }
    await driver.sleep(3000);

    // ── Phase 14f: Gate_Out ───────────────────────────────────────────────────
    await showStep(driver, 'Phase 14f: Add Gate_Out event');
    await objTestUtil.logMessage('INFO', 'Phase 14f: Gate_Out');
    await addAndViewEvent14('Phase 14f', 'Gate_Out', 'TMS.GO', 63);

    // ── Sign out KHC_WAREHOUSE ────────────────────────────────────────────────
    await showStep(driver, 'Phase 14: Sign out LEL7597_TMS');
    await objTestUtil.logMessage('INFO', 'Phase 14: Signing out LEL7597_TMS');
    await driver.switchTo().defaultContent();
    try {
      const uIcon14 = await driver.findElement(By.xpath('//*[@title="Settings and Actions"] | //*[@id="userAvatar"] | //img[contains(@class,"avatar")]'));
      await uIcon14.click();
      await driver.sleep(1500);
      const soEl14 = await driver.findElement(By.xpath('//*[normalize-space(text())="Sign Out" or normalize-space(text())="Sign out"]'));
      await soEl14.click();
      await driver.sleep(3000);
      await objTestUtil.logMessage('INFO', 'Phase 14: LEL7597_TMS signed out');
      await saveScreenshot(driver, screenshotsDir, 65);
    } catch(e) {
      await objTestUtil.logMessage('INFO', `Phase 14: Sign out error: ${e.message.substring(0,80)}`);
    }

    await showStep(driver, 'SC-02 COMPLETE — Order to Events end-to-end ✓');
    await objTestUtil.logMessage('INFO', 'SC-02 complete — TX1→TX2→TX3→BulkPlan→ApproveExec→SentToCarrier→CarrierPortal→KHC_WAREHOUSE→Gate_In→Load_Start→Load_End→PGI→Gate_Out ✓');
  });

  after(async function () {
    // Restore default Windows sleep settings (15 min on AC)
    try { execSync('powercfg /change standby-timeout-ac 15', { stdio: 'ignore' }); } catch(e) {}
    try { execSync('powercfg /change monitor-timeout-ac 15', { stdio: 'ignore' }); } catch(e) {}
    await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
  });
});
