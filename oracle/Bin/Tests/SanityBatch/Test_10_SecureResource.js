"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const CommonFunctions_1 = require("../../Src/util/CommonFunctions");
const Constants_1 = require("../../Src/util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('Test_10_SecureResource', function () {
    let testUtil;
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('Secure Resource', async function () {
        await testUtil.loadURL(Constants_1.Constants.sURL);
        await testUtil.login(Constants_1.Constants.TEST_CONFIG_FILE.NONDBAUSER, Constants_1.Constants.TEST_CONFIG_FILE.NONDBAPASSWORD);
        await testUtil.navigateFromHomePageTo("Shipment Management>Shipment Management>Buy Shipments");
        await testUtil.searchAndSelect("", "");
        await testUtil.runAction("Shipment Management>Tender>Secure Resources");
        let securedResourcesPopup = await testUtil.ShipmentManagement_Tender_SecureResources();
        let sServiceProviderID = await securedResourcesPopup.getTableColumnValue("Service Provider ID");
        await chai_1.assert.equal(sServiceProviderID, "JBHUNT", "Secure Resource");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
