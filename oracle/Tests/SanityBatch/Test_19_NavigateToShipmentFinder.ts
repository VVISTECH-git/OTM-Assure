import { assert } from "chai";
import { FinderPage } from "../../Src/Pages/FinderPage";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_19_NavigateToShipmentFinder', function () {

    let testUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('Navigate To Shipment Finder', async function () {
        await testUtil.loadURL(Constants.sURL);
        await testUtil.login(Constants.DBA_USERNAME, Constants.DBA_PASSWORD);
        await testUtil.navigateFromHomePageTo("Shipment Management>Shipment Management>Buy Shipments");
        let finderPage = await new FinderPage(testUtil.driver, testUtil.TEST_LOG_FILE);
        await assert.equal(await finderPage.isPageLoaded(), true, "Navigate to Shipment Management finder page");
    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})