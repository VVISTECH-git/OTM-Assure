import { assert } from "chai";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_13_SpatialDistanceInquiry', function () {

    let testUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('Spatial Distance Inquiry', async function () {
        await testUtil.loadURL(Constants.sURL);
        await testUtil.login(Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        let SAVED_QUERY = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "SAVED_QUERY");
        let ExpectedVal = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "EXPECTED_VAL");
        await testUtil.navigateFromHomePageTo("Ask Oracle>Distance/Time");
        let askOracleAboutDistanceAndTimeResultsPage = await testUtil.findDistanceTimeWithSavedQuery(SAVED_QUERY);
        let sDistance = await askOracleAboutDistanceAndTimeResultsPage.getTableColumnValue("Distance");
        await testUtil.logMessage("INFO", "Capturing distance" + sDistance);
        await assert.equal(sDistance, ExpectedVal, "Spatial distance Inquiry");
    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})