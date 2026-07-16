"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentViewPopup = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Popup_1 = require("../util/Popup");
const DocumentMessagePopup_1 = require("./DocumentMessagePopup");
class DocumentViewPopup extends Popup_1.Popup {
    constructor() {
        super(...arguments);
        this.sTitle = "Document";
        this.btnOpen = selenium_webdriver_1.By.xpath('//button[text()="Open"]');
    }
    async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }
    async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.waitUntilElementLocated(this.btnOpen);
    }
    async clickOpen() {
        await this.isPageLoaded();
        await this.doClick(this.btnOpen, "Clicking Open button ");
        await this.doSwitchToDefaultContent();
        return await new DocumentMessagePopup_1.DocumentMessagePopup(this.driver, this.logFile);
    }
}
exports.DocumentViewPopup = DocumentViewPopup;
