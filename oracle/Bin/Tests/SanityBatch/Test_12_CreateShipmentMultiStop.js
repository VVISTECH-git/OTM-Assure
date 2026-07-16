"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const CommonFunctions_1 = require("../../Src/util/CommonFunctions");
const Constants_1 = require("../../Src/util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('Test_12_CreateShipmentMultiStop', function () {
    let testUtil;
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('Create Multistop Shipment', async function () {
        await testUtil.loadURL(Constants_1.Constants.sURL);
        await testUtil.login(Constants_1.Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants_1.Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        await testUtil.navigateFromHomePageTo("Order Management>Order Release>Order Release");
        let OR_ID = await CommonFunctions_1.CommonFunctions.readDataFromFile(Constants_1.Constants.TEST_DATA_FILE, "OR_ID");
        await testUtil.searchAndSelect(OR_ID, "");
        await testUtil.runAction("Operational Planning>Create Buy Shipment>Multi-stop");
        let buildShipmentPopup = await testUtil.OperationalPlanning_CreateShipment_Multistop();
        let sShipmentID = await buildShipmentPopup.getTableColumnValue("ID");
        await testUtil.logMessage("INFO", "Capturing Shipment ID" + sShipmentID);
        let sServiceProviderID = await buildShipmentPopup.getTableColumnValue("Service Provider ID");
        await chai_1.assert.equal(sServiceProviderID, "JBHUNT", "Create Multistop Shipment");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
