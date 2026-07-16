"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const ApproveForExecutionPopup_1 = require("../../Src/Pages/ApproveForExecutionPopup");
const ViewPage_1 = require("../../Src/Pages/ViewPage");
const CommonFunctions_1 = require("../../Src/Util/CommonFunctions");
const Constants_1 = require("../../Src/Util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('Test_09_ApproveForExecution', function () {
    let testUtil;
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('Approve For Execution', async function () {
        await testUtil.loadURL(Constants_1.Constants.sURL);
        await testUtil.login(Constants_1.Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants_1.Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        await testUtil.navigateFromHomePageTo("Shipment Management>Shipment Management>Buy Shipments");
        await testUtil.searchAndView("", "");
        let viewPage = new ViewPage_1.ViewPage(testUtil.driver, testUtil.TEST_LOG_FILE);
        await viewPage.runAction("Shipment Management>Tender>Approve for Execution");
        let approveForExecutionPopup = new ApproveForExecutionPopup_1.ApproveForExecutionPopup(testUtil.driver, testUtil.TEST_LOG_FILE);
        let sServiceProviderID = await approveForExecutionPopup.getTableColumnValue("Service Provider ID");
        await chai_1.assert.equal(sServiceProviderID, "JBHUNT", "Approve for Execution");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
