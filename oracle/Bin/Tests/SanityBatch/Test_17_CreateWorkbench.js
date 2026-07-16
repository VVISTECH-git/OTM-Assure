"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WorkbenchPage_1 = require("../../Src/Pages/WorkbenchPage");
const CommonFunctions_1 = require("../../Src/Util/CommonFunctions");
const Constants_1 = require("../../Src/Util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('TEST_17_CreateWorkbench', function () {
    let testUtil;
    let arrTestData = {};
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
        arrTestData = await CommonFunctions_1.CommonFunctions.getDataFromFileAsDictionary(Constants_1.Constants.TEST_DATA_FILE);
    });
    it('Create Workbench', async function () {
        let sLayout = "TEST" + Date.now();
        await testUtil.loadURL(Constants_1.Constants.sURL);
        await testUtil.login(Constants_1.Constants.DBA_USERNAME, Constants_1.Constants.DBA_PASSWORD);
        await testUtil.navigateFromHomePageTo("Configuration and Administration>User Configuration>Enhanced Workbench");
        let workbenchPage = new WorkbenchPage_1.WorkbenchPage(Constants_1.Constants.driver, Constants_1.Constants.TEST_LOG_FILE);
        let isLayoutCreated = await workbenchPage.createLayout(sLayout, arrTestData['DESCRIPTION'], arrTestData['LOGICCONFIGURATION'], true);
        let alertText = await workbenchPage.getAlertMessage();
        await workbenchPage.selectLayoutAction("Done Editing");
        let isStepRes = await testUtil.compareTwoValues(isLayoutCreated && alertText.includes("New Layout successfully saved"), true, "Create Layout Assertion");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
