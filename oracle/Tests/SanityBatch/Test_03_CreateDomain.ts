import { assert } from "chai";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_03_CreateDomain', function () {

    let objTestUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        objTestUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('Create Domain', async function () {
        let sTestStatus;
        await objTestUtil.loadURL(Constants.sURL);
        await objTestUtil.login(Constants.DBA_USERNAME, Constants.DBA_PASSWORD);
        await objTestUtil.navigateFromHomePageTo("Configuration and Administration>Domain Management>Add Domain");
        let sNewDomainName = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "NEW_DOMAIN_NAME");
        let sDomainPwd = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "NEW_DOMAIN_PASSWORD");
        sTestStatus = await objTestUtil.createDomain(sNewDomainName, sDomainPwd, false);
        await assert.equal(sTestStatus, true, "Doamin Creation");
    })

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})