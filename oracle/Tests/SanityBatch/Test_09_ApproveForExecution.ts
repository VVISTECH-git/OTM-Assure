import { assert } from "chai";
import { ApproveForExecutionPopup } from "../../Src/Pages/ApproveForExecutionPopup";
import { ViewPage } from "../../Src/Pages/ViewPage";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_09_ApproveForExecution', function () {

    let testUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('Approve For Execution', async function () {
        await testUtil.loadURL(Constants.sURL);
        await testUtil.login(Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        await testUtil.navigateFromHomePageTo("Shipment Management>Shipment Management>Buy Shipments");
        await testUtil.searchAndView("", "");
        let viewPage = new ViewPage(testUtil.driver, testUtil.TEST_LOG_FILE);
        await viewPage.runAction("Shipment Management>Tender>Approve for Execution");
        let approveForExecutionPopup = new ApproveForExecutionPopup(testUtil.driver, testUtil.TEST_LOG_FILE);
        let sServiceProviderID = await approveForExecutionPopup.getTableColumnValue("Service Provider ID");
        await assert.equal(sServiceProviderID, "JBHUNT", "Approve for Execution");
    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})