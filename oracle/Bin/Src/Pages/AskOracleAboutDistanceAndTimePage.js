"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AskOracleAboutDistanceAndTimePage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../Util/Page");
const AskOracleAboutDistanceAndTimeResultsPage_1 = require("./AskOracleAboutDistanceAndTimeResultsPage");
class AskOracleAboutDistanceAndTimePage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Ask Oracle About Distance and Time";
        this.plstRequestType = selenium_webdriver_1.By.xpath('//select[@name="request_type"]');
        this.btnFindDistanceAndTime = selenium_webdriver_1.By.xpath('//button[text()="Find Distance/Time"]');
        this.plstSavedQuery = selenium_webdriver_1.By.xpath('//select[@name="temp_saved_query_name"]');
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.plstRequestType);
    }
    async setSavedQuery(sSavedQuery) {
        await this.isPageLoaded();
        await this.doSelect(this.plstSavedQuery, sSavedQuery, "Selecting Saved Query :: " + sSavedQuery);
        await this.waitUntilElementLocated(this.plstSavedQuery);
        await this.doSwitchToDefaultContent();
    }
    async clickFindDistanceAndTime() {
        await this.isPageLoaded();
        await this.doClick(this.btnFindDistanceAndTime, "Clicking FindDistanceAndTime button ");
        await this.driver.switchTo().defaultContent();
        return await new AskOracleAboutDistanceAndTimeResultsPage_1.AskOracleAboutDistanceAndTimeResultsPage(this.driver, this.logFile);
    }
}
exports.AskOracleAboutDistanceAndTimePage = AskOracleAboutDistanceAndTimePage;
