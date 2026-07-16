import { assert } from "chai";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_10_SecureResource', function () {

    let testUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('Secure Resource', async function () {
        await testUtil.loadURL(Constants.sURL);
        await testUtil.login(Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        await testUtil.navigateFromHomePageTo("Shipment Management>Shipment Management>Buy Shipments");
        await testUtil.searchAndSelect("", "");
        await testUtil.runAction("Shipment Management>Tender>Secure Resources");
        let securedResourcesPopup = await testUtil.ShipmentManagement_Tender_SecureResources();
        let sServiceProviderID = await securedResourcesPopup.getTableColumnValue("Service Provider ID");
        await assert.equal(sServiceProviderID, "JBHUNT", "Secure Resource");
    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})