import { assert } from "chai";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_08_CreateShipmentDirect', function () {

    let objTestUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        objTestUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('Create Shipment', async function () {
        await objTestUtil.loadURL(Constants.sURL);
        await objTestUtil.login(Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        await objTestUtil.navigateFromHomePageTo("Order Management>Order Release>Order Release");
        let OR_ID = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "OR_ID");
        let sExpectedServiceProviderID = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "SERVICEPROVIDER_ID");
        await objTestUtil.searchAndSelect(OR_ID, "");
        await objTestUtil.runAction("Operational Planning>Create Buy Shipment>Direct");
        let buildShipmentPopup = await objTestUtil.OperationalPlanning_CreateBuyShipment_Direct();
        let sActualServiceProviderID = await buildShipmentPopup.getTableColumnValue("Service Provider ID");
        await assert.equal(sActualServiceProviderID, sExpectedServiceProviderID, "Create Shipment");
    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})