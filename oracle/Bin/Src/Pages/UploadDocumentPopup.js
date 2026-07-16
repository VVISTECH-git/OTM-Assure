"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadDocumentPopup = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Popup_1 = require("../util/Popup");
const UploadDocumentSuccessfulPopUp_1 = require("./UploadDocumentSuccessfulPopUp");
class UploadDocumentPopup extends Popup_1.Popup {
    constructor() {
        super(...arguments);
        this.sTitle = "Upload Document";
        this.btnChooseFile = selenium_webdriver_1.By.name('file');
        this.btnUpload = selenium_webdriver_1.By.xpath('//button[text()="Upload"]');
    }
    async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }
    async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.btnUpload);
    }
    async setChooseFile(sFile) {
        await this.isPageLoaded();
        await this.doEnterText(this.btnChooseFile, sFile, "Selecting file for upload :: " + sFile);
        await this.doSwitchToDefaultContent();
    }
    async clickUpload() {
        await this.isPageLoaded();
        await this.doClick(this.btnUpload, "Clicking Upload button ");
        await this.doSwitchToDefaultContent();
    }
    async upload(sFile) {
        await this.setChooseFile(sFile);
        await this.clickUpload();
        return await new UploadDocumentSuccessfulPopUp_1.UploadDocumentSuccessfulPopup(this.driver, this.logFile);
    }
}
exports.UploadDocumentPopup = UploadDocumentPopup;
