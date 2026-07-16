"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateNewDomainResultsPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../util/Page");
class CreateNewDomainResultsPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Create New Domain Results";
        this.btnReturn = selenium_webdriver_1.By.xpath('//button[1]');
        this.txtConfirmationMsg = selenium_webdriver_1.By.xpath('//div[contains(@class,"msgLine msgSub")]');
        this.frmFrame = selenium_webdriver_1.By.xpath("//iframe[contains(@src,'glog.webserver.util.QueryResponseServlet')]");
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(this.frmFrame);
        await this.waitUntilElementLocated(this.btnReturn);
    }
    async getConfirmationMessage() {
        await this.isPageLoaded();
        let sMessage = await this.doGetText(this.txtConfirmationMsg, "Reading confirmation message");
        await this.driver.switchTo().defaultContent();
        return sMessage;
    }
    async clickReturn() {
        await this.isPageLoaded();
        await this.doClick(this.btnReturn, "Clicking Retunr button");
        await this.driver.switchTo().defaultContent();
    }
}
exports.CreateNewDomainResultsPage = CreateNewDomainResultsPage;
