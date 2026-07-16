"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApproveInvoiceByLinePopup = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Popup_1 = require("../Util/Popup");
class ApproveInvoiceByLinePopup extends Popup_1.Popup {
    constructor() {
        super(...arguments);
        this.sTitle = "Approve Invoice By Line";
        this.txtApproveInvoiceLineHeader = selenium_webdriver_1.By.xpath('//h1[text()="Approve Invoice By Line"]');
    }
    async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }
    async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.txtApproveInvoiceLineHeader);
    }
}
exports.ApproveInvoiceByLinePopup = ApproveInvoiceByLinePopup;
