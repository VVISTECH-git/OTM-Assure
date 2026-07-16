"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const OBIEEHomePage_1 = require("../../Src/Pages/OBIEEHomePage");
const CommonFunctions_1 = require("../../Src/util/CommonFunctions");
const Constants_1 = require("../../Src/util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('Test_20_OBIEEConsoleLogin', function () {
    let testUtil;
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('OBIEE Console Login', async function () {
        await testUtil.loadURL(Constants_1.Constants.sURL + "/analytics");
        await testUtil.login(Constants_1.Constants.DBA_USERNAME, Constants_1.Constants.DBA_PASSWORD);
        let oBIEEHomePage = await new OBIEEHomePage_1.OBIEEHomePage(testUtil.driver, testUtil.TEST_LOG_FILE);
        let bVerifyHomePage = await oBIEEHomePage.isPageLoaded();
        await chai_1.assert.equal(bVerifyHomePage, true, "OBIEE Console login");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
