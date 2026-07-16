"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApproveInvoicePopup = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Popup_1 = require("../util/Popup");
const ApproveInvoiceByLinePopup_1 = require("./ApproveInvoiceByLinePopup");
class ApproveInvoicePopup extends Popup_1.Popup {
    constructor() {
        super(...arguments);
        this.sTitle = "Approve Invoice";
        this.btnFinish = selenium_webdriver_1.By.xpath('//button[@name="finish"]');
    }
    async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }
    async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.btnFinish);
    }
    async clickFinish() {
        await this.isPageLoaded();
        await this.doClick(this.btnFinish, "Clicking Finish button");
        await this.doSwitchToDefaultContent();
        await this.moveFocusToParentWindow();
        return await new ApproveInvoiceByLinePopup_1.ApproveInvoiceByLinePopup(this.driver, this.logFile);
    }
}
exports.ApproveInvoicePopup = ApproveInvoicePopup;
