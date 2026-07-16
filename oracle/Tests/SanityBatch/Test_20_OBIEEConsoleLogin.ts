import { assert } from "chai";
import { OBIEEHomePage } from "../../Src/Pages/OBIEEHomePage";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_20_OBIEEConsoleLogin', function () {

    let testUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('OBIEE Console Login', async function () {
        await testUtil.loadURL(Constants.sURL + "/analytics");
        await testUtil.login(Constants.DBA_USERNAME, Constants.DBA_PASSWORD);
        let oBIEEHomePage = await new OBIEEHomePage(testUtil.driver, testUtil.TEST_LOG_FILE);
        let bVerifyHomePage = await oBIEEHomePage.isPageLoaded();
        await assert.equal(bVerifyHomePage, true, "OBIEE Console login");
    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})