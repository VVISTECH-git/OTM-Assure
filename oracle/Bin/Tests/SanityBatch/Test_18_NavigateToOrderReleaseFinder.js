"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const FinderPage_1 = require("../../Src/Pages/FinderPage");
const CommonFunctions_1 = require("../../Src/util/CommonFunctions");
const Constants_1 = require("../../Src/util/Constants");
const TestUtil_1 = require("../../Src/Util/TestUtil");
describe('Test_18_NavigateToOrderReleaseFinder', function () {
    let testUtil;
    before(async function () {
        await Constants_1.Constants.init_TestConfig(__filename, module.filename, this);
        testUtil = new TestUtil_1.TestUtil(Constants_1.Constants.driver, Constants_1.Constants.sURL, Constants_1.Constants.TEST_LOG_FOLDER, Constants_1.Constants.TESTCASE_NAME, Constants_1.Constants.TEST_SUMMARY_FILE);
    });
    it('Navigate To Order Release Finder', async function () {
        await testUtil.loadURL(Constants_1.Constants.sURL);
        await testUtil.login(Constants_1.Constants.DBA_USERNAME, Constants_1.Constants.DBA_PASSWORD);
        await testUtil.navigateFromHomePageTo("Order Management>Order Release>Order Release");
        let finderPage = await new FinderPage_1.FinderPage(testUtil.driver, testUtil.TEST_LOG_FILE);
        await chai_1.assert.equal(await finderPage.isPageLoaded(), true, "Navigate to Order Release finder page");
    });
    after(async function () {
        await CommonFunctions_1.CommonFunctions.afterTest(this.currentTest.state);
    });
});
