import { assert } from "chai";
import { BIPHomePage } from "../../Src/Pages/BIPHomePage";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_21_BIPConsoleLogin', function () {

    let testUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('BIP Console Login', async function () {
        await testUtil.loadURL(Constants.sURL + "/xmlpserver");
        await testUtil.login(Constants.DBA_USERNAME, Constants.DBA_PASSWORD);
        let bIPHomePage = await new BIPHomePage(testUtil.driver, testUtil.TEST_LOG_FILE);
        let bVerifyHomePage = await bIPHomePage.isPageLoaded();
        await assert.equal(bVerifyHomePage, true, "BIP Console login");
    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})