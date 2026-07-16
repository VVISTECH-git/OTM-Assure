import { assert } from "chai";
import { FinderPage } from "../../Src/Pages/FinderPage";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_18_NavigateToOrderReleaseFinder', function () {

    let testUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('Navigate To Order Release Finder', async function () {
        await testUtil.loadURL(Constants.sURL);
        await testUtil.login(Constants.DBA_USERNAME, Constants.DBA_PASSWORD);
        await testUtil.navigateFromHomePageTo("Order Management>Order Release>Order Release");
        let finderPage = await new FinderPage(testUtil.driver, testUtil.TEST_LOG_FILE);
        await assert.equal(await finderPage.isPageLoaded(), true, "Navigate to Order Release finder page");
    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})