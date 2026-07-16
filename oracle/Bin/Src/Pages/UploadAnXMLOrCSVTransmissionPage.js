"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadAnXMLOrCSVTransmissionPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../Util/Page");
class UploadAnXMLOrCSVTransmissionPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Upload XML/CSV Transmission";
        this.btnChooseFile = selenium_webdriver_1.By.xpath('//input[@name="file"]');
        this.btnUpload = selenium_webdriver_1.By.xpath('//button[text()="Upload"]');
    }
    async isPageLoaded(sFramePresent = true) {
        await this.waitUntilPageTitleContains(this.sTitle);
        if (sFramePresent == true) {
            await this.doSwitchToFrame(0);
        }
        return true;
    }
    async setChooseFile(sFilePath, sFramePresent = true) {
        await this.isPageLoaded(sFramePresent);
        await this.doEnterText(this.btnChooseFile, sFilePath, "Uploading File - " + sFilePath);
        await this.doSwitchToDefaultContent();
    }
    async clickUpload(sFramePresent = true) {
        await this.isPageLoaded(sFramePresent);
        await this.doClick(this.btnUpload, "Clicking Upload button");
        await this.doSwitchToDefaultContent();
    }
    async uploadFile(sFilePath, iNoofSecondsToWait, sFramePresent = true) {
        await this.setChooseFile(sFilePath, sFramePresent);
        await this.clickUpload(sFramePresent);
        await this.logMessage("INFO", "Waiting for " + iNoofSecondsToWait + " sec");
        await this.driver.sleep(iNoofSecondsToWait * 1000);
    }
}
exports.UploadAnXMLOrCSVTransmissionPage = UploadAnXMLOrCSVTransmissionPage;
