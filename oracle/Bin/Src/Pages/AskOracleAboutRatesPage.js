"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AskOracleAboutRatesPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../util/Page");
const AskOracleAboutRatesResultsPage_1 = require("./AskOracleAboutRatesResultsPage");
class AskOracleAboutRatesPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Ask Oracle About Rates";
        this.btnSearch = selenium_webdriver_1.By.xpath('//button[text()="Search"]');
        this.plstSavedQuery = selenium_webdriver_1.By.xpath('//select[@name="fav_query_name"]');
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.plstSavedQuery);
    }
    async setSavedQuery(sSavedQuery) {
        await this.isPageLoaded();
        await this.doSelect(this.plstSavedQuery, sSavedQuery, "Selecting Saved Query :: " + sSavedQuery);
        await this.driver.sleep(5000);
        await this.doSwitchToDefaultContent();
    }
    async clickSearch() {
        await this.isPageLoaded();
        await this.doClick(this.btnSearch, "Clicking Saerch button ");
        await this.driver.switchTo().defaultContent();
        return await new AskOracleAboutRatesResultsPage_1.AskOracleAboutRatesResultsPage(this.driver, this.logFile);
    }
}
exports.AskOracleAboutRatesPage = AskOracleAboutRatesPage;
