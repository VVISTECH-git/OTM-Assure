import { assert } from "chai";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_04_CreateUser', function () {

    let objTestUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        objTestUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('Create User', async function () {
        let sTestStatus = true;

        await objTestUtil.loadURL(Constants.sURL);
        await objTestUtil.login(Constants.DBA_USERNAME, Constants.DBA_PASSWORD);

        let sNewUserName = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "NEW_USERNAME");
        let sNewDomain = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "NEW_USER_DOMAIN");
        let sNewPwd = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "NEW_USER_PASSWORD");
        let sNickName = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "NICK_USERNAME");

        await objTestUtil.navigateFromHomePageTo("Configuration and Administration>User Management>User Manager");
        await objTestUtil.searchAndNew("", "");

        sTestStatus = await objTestUtil.createUser(sNewDomain, sNewUserName, sNickName, sNewPwd, false);
        await assert.equal(sTestStatus, true, "Create User");

    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})