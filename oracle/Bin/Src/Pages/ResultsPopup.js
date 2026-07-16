"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultsPopup = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Popup_1 = require("../Util/Popup");
class ResultsPopup extends Popup_1.Popup {
    constructor() {
        super(...arguments);
        this.sTitle = "Results";
        this.txtConfirmationMsg = selenium_webdriver_1.By.xpath('//span[contains(text(),"success")]');
    }
    async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }
    async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
    }
    async getConfirmationMessage() {
        await this.isPageLoaded();
        let sMessage = await this.doGetText(this.txtConfirmationMsg, "Reading confirmation message");
        await this.driver.switchTo().defaultContent();
        return sMessage;
    }
}
exports.ResultsPopup = ResultsPopup;
