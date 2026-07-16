"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const CommonFunctions_1 = require("../../Src/util/CommonFunctions");
const Constants_1 = require("../../Src/util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('Test_15_UploadDocument', function () {
    let testUtil;
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('Upload Document', async function () {
        await testUtil.loadURL(Constants_1.Constants.sURL);
        await testUtil.login(Constants_1.Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants_1.Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        await testUtil.navigateFromHomePageTo("Shipment Management>Location Manager");
        let sLocID = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "LOCATONID");
        await testUtil.searchAndSelect(sLocID, "");
        await testUtil.runAction("Business Process Automation>Documents>Upload Document");
        let strFileName = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "FILEPATH");
        let sFile = await await require('path').join(Constants_1.Constants.TEST_DATA_FOLDER, strFileName);
        let sTextContent = await testUtil.BusinessProcessAutomation_Documents_UploadDocument(sFile);
        await testUtil.logMessage("INFO", "Text content " + sTextContent);
        await chai_1.assert.equal(sTextContent, "test", "Uplaod Document");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
