"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaunchIntegrationPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../Util/Page");
const UploadAnXMLOrCSVTransmissionPage_1 = require("./UploadAnXMLOrCSVTransmissionPage");
class LaunchIntegrationPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Launch Integration";
        this.lnkUploadAnXMLOrCSVTransmission = selenium_webdriver_1.By.xpath('//a[text()="Upload an XML/CSV Transmission"]');
        this.frmFrameID = selenium_webdriver_1.By.xpath("//iframe[@id='mainIFrame']");
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(this.frmFrameID);
        await this.waitUntilElementLocated(this.lnkUploadAnXMLOrCSVTransmission);
        return true;
    }
    async clickkUploadAnXMLOrCSVTransmission() {
        await this.isPageLoaded();
        await this.doClick(this.lnkUploadAnXMLOrCSVTransmission, "Clicking Upload An XML CSV Transmission Link");
        await this.driver.switchTo().defaultContent();
    }
    async navigateUploadAnCSVOrXMLTransmissionPage() {
        await this.clickkUploadAnXMLOrCSVTransmission();
        return new UploadAnXMLOrCSVTransmissionPage_1.UploadAnXMLOrCSVTransmissionPage(this.driver, this.logFile);
    }
}
exports.LaunchIntegrationPage = LaunchIntegrationPage;
