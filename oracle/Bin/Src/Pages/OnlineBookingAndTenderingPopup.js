"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineBookingAndTenderingPopup = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Popup_1 = require("../Util/Popup");
const ResultsPopup_1 = require("./ResultsPopup");
class OnlineBookingAndTenderingPopup extends Popup_1.Popup {
    constructor() {
        super(...arguments);
        this.sTitle = "Online Booking/Tendering";
        this.btnFinished = selenium_webdriver_1.By.id('save_button');
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
    async clickFinished() {
        await this.isPageLoaded();
        await this.doClick(this.btnFinished, "Clicking Finish button");
        await this.doSwitchToDefaultContent();
        await this.moveFocusToParentWindow();
        return await new ResultsPopup_1.ResultsPopup(this.driver, this.logFile);
    }
}
exports.OnlineBookingAndTenderingPopup = OnlineBookingAndTenderingPopup;
