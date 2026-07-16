"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const BIPHomePage_1 = require("../../Src/Pages/BIPHomePage");
const CommonFunctions_1 = require("../../Src/Util/CommonFunctions");
const Constants_1 = require("../../Src/Util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('Test_21_BIPConsoleLogin', function () {
    let testUtil;
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('BIP Console Login', async function () {
        await testUtil.loadURL(Constants_1.Constants.sURL + "/xmlpserver");
        await testUtil.login(Constants_1.Constants.DBA_USERNAME, Constants_1.Constants.DBA_PASSWORD);
        let bIPHomePage = await new BIPHomePage_1.BIPHomePage(testUtil.driver, testUtil.TEST_LOG_FILE);
        let bVerifyHomePage = await bIPHomePage.isPageLoaded();
        await chai_1.assert.equal(bVerifyHomePage, true, "BIP Console login");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
