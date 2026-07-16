"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const chai_1 = require("chai");
const CommonFunctions_1 = require("../../Src/Util/CommonFunctions");
const Constants_1 = require("../../Src/Util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
const LoginPage_1 = require("../../Src/Pages/LoginPage");
const HomePage_1 = require("../../Src/Pages/HomePage");

async function saveScreenshot(driver, screenshotsDir, stepIndex) {
    if (!screenshotsDir) return;
    try {
        fs.mkdirSync(screenshotsDir, { recursive: true });
        const img = await driver.takeScreenshot();
        fs.writeFileSync(path.join(screenshotsDir, `step_${stepIndex}.png`), img, 'base64');
    } catch (e) {}
}

describe('Test_01_Login', function () {
    let objTestUtil;
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        objTestUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('Login', async function () {
        const driver = Constants_1.Constants.driver;
        const screenshotsDir = process.env.SCREENSHOTS_DIR || null;

        // Step 0: Load OTM URL — wait for page to fully render before screenshot
        await objTestUtil.loadURL(Constants_1.Constants.sURL);
        await driver.sleep(3000);
        await saveScreenshot(driver, screenshotsDir, 0);

        // Step 1: Enter username — screenshot shows username filled in the form
        const loginPage = new LoginPage_1.LoginPage(driver, objTestUtil.TEST_LOG_FILE);
        await loginPage.isPageLoaded("OCI");
        await loginPage.setUserName(Constants_1.Constants.DBA_USERNAME, "OCI");
        await driver.sleep(1000);
        await saveScreenshot(driver, screenshotsDir, 1);

        // Step 2: Enter password — screenshot shows password field filled (masked)
        await loginPage.setPassword(Constants_1.Constants.DBA_PASSWORD, "OCI");
        await driver.sleep(1000);
        await saveScreenshot(driver, screenshotsDir, 2);

        // Step 3: Click Sign In — screenshot taken BEFORE clicking (shows completed form, ready to submit)
        await saveScreenshot(driver, screenshotsDir, 3);
        await loginPage.clickLogin("OCI");

        // Step 4: Verify home page — wait for full visual render before screenshot
        const homePage = new HomePage_1.HomePage(driver, objTestUtil.TEST_LOG_FILE);
        const isHomePageDisplayed = await homePage.isPageLoaded();
        await driver.sleep(4000);
        await saveScreenshot(driver, screenshotsDir, 4);

        await chai_1.assert.equal(true, isHomePageDisplayed, "HomePage verification");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
