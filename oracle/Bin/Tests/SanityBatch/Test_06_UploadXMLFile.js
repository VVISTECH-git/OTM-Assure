"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const CommonFunctions_1 = require("../../Src/util/CommonFunctions");
const Constants_1 = require("../../Src/util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('Test_06_UploadXMLFile', function () {
    let objTestUtil;
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        objTestUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('Upload File', async function () {
        await objTestUtil.loadURL(Constants_1.Constants.sURL);
        await objTestUtil.login(Constants_1.Constants.DBA_USERNAME, Constants_1.Constants.DBA_PASSWORD);
        await objTestUtil.navigateToHomePage();
        let strFileName = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "UPLOAD_DATA_FILE");
        let sFile = await require('path').join(Constants_1.Constants.TEST_DATA_FOLDER, strFileName);
        let Res = await objTestUtil.uploadFile(sFile, 10);
        await chai_1.assert.equal(Res, true, "Upload xml file");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
