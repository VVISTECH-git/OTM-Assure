"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AskOracleAboutDistanceAndTimeResultsPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../util/Page");
class AskOracleAboutDistanceAndTimeResultsPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Ask Oracle About Distance and Time Results";
        this.txtDistanceTime = selenium_webdriver_1.By.xpath('//span[contains(text(),"Distance/Time Results")]');
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.txtDistanceTime);
    }
    async getTableColumnValue(sFieldName) {
        await this.isPageLoaded();
        await this.logMessage("INFO", await this.driver.getTitle());
        let Table = await this.driver.findElements(selenium_webdriver_1.By.xpath("//table[@summary='Distance/Time Results']"));
        let tblcnt = 1;
        let sColumnVal = "";
        let BreakOuterLoop = false;
        let colCnt = await this.driver.findElements(selenium_webdriver_1.By.xpath("//table[@summary='Distance/Time Results']/thead/tr/td"));
        if (colCnt.length > 0) {
            let ColCnt = 1;
            for (let col of colCnt) {
                let text = await col.getText();
                if (await text.toUpperCase() == sFieldName.toUpperCase()) {
                    sColumnVal = await this.driver.findElement(selenium_webdriver_1.By.xpath("//table[@summary='Distance/Time Results']/tbody//td[" + ColCnt + "]")).getText();
                    BreakOuterLoop = true;
                    break;
                }
                ColCnt++;
            }
        }
        await this.driver.switchTo().defaultContent();
        return await sColumnVal;
    }
}
exports.AskOracleAboutDistanceAndTimeResultsPage = AskOracleAboutDistanceAndTimeResultsPage;
