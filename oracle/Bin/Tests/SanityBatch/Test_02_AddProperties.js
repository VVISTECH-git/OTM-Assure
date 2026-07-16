"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const CommonFunctions_1 = require("../../Src/Util/CommonFunctions");
const Constants_1 = require("../../Src/Util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('Test_02_AddProperties', function () {
    let objTestUtil;
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        objTestUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('Add Properties', async function () {
        let sTestStatus = true;
        await objTestUtil.loadURL(Constants_1.Constants.sURL);
        await objTestUtil.login(Constants_1.Constants.DBA_USERNAME, Constants_1.Constants.DBA_PASSWORD);
        await objTestUtil.navigateFromHomePageTo("Configuration and Administration>Property Management>Property Sets");
        await objTestUtil.searchAndEdit("CUSTOM", "");
        let iTotalPropertiesCount = await Number(await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "TOTAL_NO_OF_PROPERTIES"));
        for (let j = 1; j <= iTotalPropertiesCount; j++) {
            let sPropertyKey, sPropertyVal;
            sPropertyKey = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "PROPERTY_KEY" + j);
            sPropertyVal = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "PROPERTY_VALUE" + j);
            let sRes;
            if (j == iTotalPropertiesCount)
                sRes = await objTestUtil.addProperty("" + j, sPropertyKey, sPropertyVal, sPropertyVal, true);
            else
                sRes = await objTestUtil.addProperty("" + j, sPropertyKey, sPropertyVal, sPropertyVal, false);
            if (sRes != true)
                sTestStatus = false;
        }
        await chai_1.assert.equal(sTestStatus, true, "Adding CUSTOM Properties");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
