"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentMessagePopup = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Popup_1 = require("../Util/Popup");
class DocumentMessagePopup extends Popup_1.Popup {
    constructor() {
        super(...arguments);
        this.txtContent = selenium_webdriver_1.By.xpath('//pre');
    }
    async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }
    async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilElementLocated(this.txtContent);
    }
    async getContext() {
        await this.isPageLoaded();
        let sText = await this.doGetText(this.txtContent, "Reading content ");
        await this.doSwitchToDefaultContent();
        return await sText;
    }
}
exports.DocumentMessagePopup = DocumentMessagePopup;
