"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AskOracleAboutRatesResultsPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../Util/Page");
class AskOracleAboutRatesResultsPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Ask Oracle About Rates";
        this.txtRates = selenium_webdriver_1.By.xpath('//span[text()="Rates"]');
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.txtRates);
    }
    async getTableColumnValue(sFieldName) {
        await this.isPageLoaded();
        let Table = await this.driver.findElements(selenium_webdriver_1.By.xpath("//table[@summary='Rates']"));
        let tblcnt = 1;
        let sColumnVal = "";
        let BreakOuterLoop = false;
        let colCnt = await this.driver.findElements(selenium_webdriver_1.By.xpath("//table[@summary='Rates']//tr[@type='header']/th"));
        if (colCnt.length > 0) {
            let ColCnt = 1;
            for (let col of colCnt) {
                let text = await col.getText();
                if (await text.toUpperCase() == sFieldName.toUpperCase()) {
                    sColumnVal = await this.driver.findElement(selenium_webdriver_1.By.xpath("//table[@summary='Rates']//tr[@class='rowOdd']/td[" + ColCnt + "]")).getText();
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
exports.AskOracleAboutRatesResultsPage = AskOracleAboutRatesResultsPage;
