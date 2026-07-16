"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const CommonFunctions_1 = require("../../Src/Util/CommonFunctions");
const Constants_1 = require("../../Src/Util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('Test_08_CreateShipmentDirect', function () {
    let objTestUtil;
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        objTestUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('Create Shipment', async function () {
        await objTestUtil.loadURL(Constants_1.Constants.sURL);
        await objTestUtil.login(Constants_1.Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants_1.Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        await objTestUtil.navigateFromHomePageTo("Order Management>Order Release>Order Release");
        let OR_ID = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "OR_ID");
        let sExpectedServiceProviderID = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "SERVICEPROVIDER_ID");
        await objTestUtil.searchAndSelect(OR_ID, "");
        await objTestUtil.runAction("Operational Planning>Create Buy Shipment>Direct");
        let buildShipmentPopup = await objTestUtil.OperationalPlanning_CreateBuyShipment_Direct();
        let sActualServiceProviderID = await buildShipmentPopup.getTableColumnValue("Service Provider ID");
        await chai_1.assert.equal(sActualServiceProviderID, sExpectedServiceProviderID, "Create Shipment");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
