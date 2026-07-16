"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCreationResultsPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../util/Page");
class UserCreationResultsPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Results";
        this.txtConfirmationMsg = selenium_webdriver_1.By.xpath('(//span[@class="text"])[3]');
        this.btnCreateAnother = selenium_webdriver_1.By.xpath('//button[@name="create_another_button"]');
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.btnCreateAnother);
    }
    async clickCreateAnother() {
        await this.isPageLoaded();
        await this.doClick(this.btnCreateAnother, "Clicking CreateAnother Link ");
        await this.doSwitchToDefaultContent();
    }
    async getConfirmationMessage() {
        await this.isPageLoaded();
        let sMessage = await this.doGetText(this.txtConfirmationMsg, "Reading confirmation message");
        await this.driver.switchTo().defaultContent();
        return sMessage;
    }
}
exports.UserCreationResultsPage = UserCreationResultsPage;
