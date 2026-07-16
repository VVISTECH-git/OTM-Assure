import { assert } from "chai";
import { WorkbenchPage } from "../../Src/Pages/WorkbenchPage";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('TEST_17_CreateWorkbench', function () {

    let testUtil: TestUtil;
    let arrTestData: { [key: string]: string } = {};

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
        arrTestData = await CommonFunctions.getDataFromFileAsDictionary(Constants.TEST_DATA_FILE);
    })

    it('Create Workbench', async function () {     
        let sLayout = "TEST" + Date.now();        
        await testUtil.loadURL(Constants.sURL);
        await testUtil.login(Constants.DBA_USERNAME, Constants.DBA_PASSWORD);
        await testUtil.navigateFromHomePageTo("Configuration and Administration>User Configuration>Enhanced Workbench");
        let workbenchPage    = new WorkbenchPage(Constants.driver, Constants.TEST_LOG_FILE);
        let isLayoutCreated = await workbenchPage.createLayout(sLayout, arrTestData['DESCRIPTION'], arrTestData['LOGICCONFIGURATION'], true);
        let alertText = await workbenchPage.getAlertMessage();
        await workbenchPage.selectLayoutAction("Done Editing");
        let isStepRes = await testUtil.compareTwoValues(isLayoutCreated && alertText.includes("New Layout successfully saved"), true, "Create Layout Assertion");      
    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})