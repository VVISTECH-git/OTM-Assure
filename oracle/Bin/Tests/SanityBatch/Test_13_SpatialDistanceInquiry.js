"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const CommonFunctions_1 = require("../../Src/util/CommonFunctions");
const Constants_1 = require("../../Src/util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('Test_13_SpatialDistanceInquiry', function () {
    let testUtil;
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('Spatial Distance Inquiry', async function () {
        await testUtil.loadURL(Constants_1.Constants.sURL);
        await testUtil.login(Constants_1.Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants_1.Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        let SAVED_QUERY = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "SAVED_QUERY");
        let ExpectedVal = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "EXPECTED_VAL");
        await testUtil.navigateFromHomePageTo("Ask Oracle>Distance/Time");
        let askOracleAboutDistanceAndTimeResultsPage = await testUtil.findDistanceTimeWithSavedQuery(SAVED_QUERY);
        let sDistance = await askOracleAboutDistanceAndTimeResultsPage.getTableColumnValue("Distance");
        await testUtil.logMessage("INFO", "Capturing distance" + sDistance);
        await chai_1.assert.equal(sDistance, ExpectedVal, "Spatial distance Inquiry");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
