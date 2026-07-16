import { assert } from "chai";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_02_AddProperties', function () {

    let objTestUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        objTestUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('Add Properties', async function () {
        let sTestStatus = true;
        await objTestUtil.loadURL(Constants.sURL);
        await objTestUtil.login(Constants.DBA_USERNAME, Constants.DBA_PASSWORD);
        await objTestUtil.navigateFromHomePageTo("Configuration and Administration>Property Management>Property Sets");
        await objTestUtil.searchAndEdit("CUSTOM", "");

        let iTotalPropertiesCount: number = await Number(await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "TOTAL_NO_OF_PROPERTIES"));

        for (let j = 1; j <= iTotalPropertiesCount; j++) {
            let sPropertyKey, sPropertyVal;
            sPropertyKey = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "PROPERTY_KEY" + j);
            sPropertyVal = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "PROPERTY_VALUE" + j);
            let sRes;
            if (j == iTotalPropertiesCount)
                sRes = await objTestUtil.addProperty("" + j, sPropertyKey, sPropertyVal, sPropertyVal, true);
            else
                sRes = await objTestUtil.addProperty("" + j, sPropertyKey, sPropertyVal, sPropertyVal, false);
            if (sRes != true)
                sTestStatus = false;
        }
        await assert.equal(sTestStatus, true, "Adding CUSTOM Properties");

    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})