import { assert } from "chai";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_15_UploadDocument', function () {

    let testUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('Upload Document', async function () {
        await testUtil.loadURL(Constants.sURL);
        await testUtil.login(Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        await testUtil.navigateFromHomePageTo("Shipment Management>Location Manager");
        let sLocID = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "LOCATONID");
        await testUtil.searchAndSelect(sLocID, "");
        await testUtil.runAction("Business Process Automation>Documents>Upload Document");
        let strFileName = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "FILEPATH");
        let sFile = await await require('path').join(Constants.TEST_DATA_FOLDER, strFileName);
        let sTextContent = await testUtil.BusinessProcessAutomation_Documents_UploadDocument(sFile);
        await testUtil.logMessage("INFO", "Text content " + sTextContent);
        await assert.equal(sTextContent, "test", "Uplaod Document");
    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})