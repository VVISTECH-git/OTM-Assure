import { assert } from "chai";
import { CommonFunctions } from "../../Src/util/CommonFunctions";
import { Constants } from "../../Src/util/Constants";
import { TestUtil } from "../../Src/Util/TestUtil";

describe('Test_12_CreateShipmentMultiStop', function () {

    let testUtil: TestUtil;

    before(async function () {
        await Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil(Constants.driver, Constants.sURL, Constants.TEST_LOG_FOLDER, Constants.TESTCASE_NAME, Constants.TEST_SUMMARY_FILE);
    })

    it('Create Multistop Shipment', async function () {
        await testUtil.loadURL(Constants.sURL);
        await testUtil.login(Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        await testUtil.navigateFromHomePageTo("Order Management>Order Release>Order Release");
        let OR_ID = await CommonFunctions.readDataFromFile(Constants.TEST_DATA_FILE, "OR_ID");
        await testUtil.searchAndSelect(OR_ID, "");
        await testUtil.runAction("Operational Planning>Create Buy Shipment>Multi-stop");
        let buildShipmentPopup = await testUtil.OperationalPlanning_CreateShipment_Multistop();
        let sShipmentID = await buildShipmentPopup.getTableColumnValue("ID");
        await testUtil.logMessage("INFO", "Capturing Shipment ID" + sShipmentID);
        let sServiceProviderID = await buildShipmentPopup.getTableColumnValue("Service Provider ID");
        await assert.equal(sServiceProviderID, "JBHUNT", "Create Multistop Shipment");
    });

    after(async function () {
        await CommonFunctions.afterTest(this.currentTest.state);
    })

})