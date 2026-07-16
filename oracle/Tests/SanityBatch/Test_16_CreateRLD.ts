import { assert } from "chai";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_16_CreateRLD', function () {

    let testUtil: TestUtil;
    let arrTestData: { [key: string]: string } = {};

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);      
    })

    it('Create RLD', async function () {
        let sRLDID = "RLD" + Date.now();
        let sRateOfferingID = "JBHUNT OFFERING";        
        await testUtil.loadURL(Constants.sURL);
        await testUtil.login(Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        let RetVal = await testUtil.createRLD(sRLDID, sRateOfferingID);
        await assert.equal(RetVal, true);
    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})