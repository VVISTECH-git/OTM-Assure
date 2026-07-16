import { assert } from "chai";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_07_DBXMLImport', function () {

    let objTestUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        objTestUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('DBXML Import', async function () {
        let sTestStatus = true;
        await objTestUtil.loadURL(Constants.sURL);
        await objTestUtil.login(Constants.DBA_USERNAME, Constants.DBA_PASSWORD);
        let strFileName = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "UPLOAD_DATA_FILE");
        let sFile = await require('path').join(Constants.TEST_DATA_FOLDER, strFileName);
        await objTestUtil.dbXmlImport(sFile, 10);
        await assert.equal(sTestStatus, true, "DB XML file import");
    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})