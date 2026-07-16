"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const CommonFunctions_1 = require("../../Src/Util/CommonFunctions");
const Constants_1 = require("../../Src/Util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('Test_04_CreateUser', function () {
    let objTestUtil;
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        objTestUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('Create User', async function () {
        let sTestStatus = true;
        await objTestUtil.loadURL(Constants_1.Constants.sURL);
        await objTestUtil.login(Constants_1.Constants.DBA_USERNAME, Constants_1.Constants.DBA_PASSWORD);
        let sNewUserName = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "NEW_USERNAME");
        let sNewDomain = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "NEW_USER_DOMAIN");
        let sNewPwd = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "NEW_USER_PASSWORD");
        let sNickName = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "NICK_USERNAME");
        await objTestUtil.navigateFromHomePageTo("Configuration and Administration>User Management>User Manager");
        await objTestUtil.searchAndNew("", "");
        sTestStatus = await objTestUtil.createUser(sNewDomain, sNewUserName, sNickName, sNewPwd, false);
        await chai_1.assert.equal(sTestStatus, true, "Create User");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
