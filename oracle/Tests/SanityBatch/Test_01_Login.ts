import { assert } from "chai";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_01_Login', function () {

    let objTestUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        objTestUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('Login', async function () {
        await objTestUtil.loadURL(Constants.sURL);
        let ishomepagedisplayed = await objTestUtil.login(Constants.DBA_USERNAME, Constants.DBA_PASSWORD);
        await assert.equal(true, ishomepagedisplayed, "HomePage verification");
    })

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})