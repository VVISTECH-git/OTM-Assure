"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const CommonFunctions_1 = require("../../Src/util/CommonFunctions");
const Constants_1 = require("../../Src/util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('Test_16_CreateRLD', function () {
    let testUtil;
    let arrTestData = {};
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('Create RLD', async function () {
        let sRLDID = "RLD" + Date.now();
        let sRateOfferingID = "JBHUNT OFFERING";
        await testUtil.loadURL(Constants_1.Constants.sURL);
        await testUtil.login(Constants_1.Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants_1.Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        let RetVal = await testUtil.createRLD(sRLDID, sRateOfferingID);
        await chai_1.assert.equal(RetVal, true);
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
