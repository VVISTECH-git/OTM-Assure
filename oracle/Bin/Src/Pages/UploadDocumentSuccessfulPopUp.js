"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadDocumentSuccessfulPopup = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Popup_1 = require("../util/Popup");
const DocumentViewPopup_1 = require("./DocumentViewPopup");
class UploadDocumentSuccessfulPopup extends Popup_1.Popup {
    constructor() {
        super(...arguments);
        this.sTitle = "Documents Upload Successful";
        this.btnViewDocument = selenium_webdriver_1.By.xpath('//a[contains(@onclick,"PopupWindow(formatUrl")]');
        this.btnViewContent = selenium_webdriver_1.By.xpath('//button[text()="View Content"]');
    }
    async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }
    async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.btnViewContent);
    }
    async clickViewDocument() {
        await this.isPageLoaded();
        await this.doClick(this.btnViewDocument, "Clicking View Document button ");
        await this.doSwitchToDefaultContent();
        return await new DocumentViewPopup_1.DocumentViewPopup(this.driver, this.logFile);
    }
}
exports.UploadDocumentSuccessfulPopup = UploadDocumentSuccessfulPopup;
