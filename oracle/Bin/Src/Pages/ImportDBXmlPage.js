"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportDBXmlPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../util/Page");
const ImportDBXmlResultsPage_1 = require("./ImportDBXmlResultsPage");
class ImportDBXmlPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Import DB.XML";
        this.btnBrowseInputXmlFile = selenium_webdriver_1.By.xpath('//input[@name="inputXMLFile"]');
        this.plstTransactionCode = selenium_webdriver_1.By.xpath('//select[@name="transactionCode"]');
        this.btnRun = selenium_webdriver_1.By.xpath('//button[@id="run_button"]');
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.driver.switchTo().frame(0);
        await this.waitUntilElementLocated(this.btnBrowseInputXmlFile);
        return true;
    }
    async setBrowseInputXmlFile(sFile) {
        await this.isPageLoaded();
        await this.doEnterText(this.btnBrowseInputXmlFile, sFile, "Entering file to upload ::" + sFile);
        await this.driver.switchTo().defaultContent();
    }
    async setTransactionCode(sValue) {
        await this.isPageLoaded();
        let strNameAttrib = await this.doGetAttribute(this.plstTransactionCode, 'name', "Capturing name attribute");
        await this.doSelectByText(strNameAttrib, sValue, "Selecting Value ::" + sValue);
        await this.driver.switchTo().defaultContent();
    }
    async clickRun() {
        await this.isPageLoaded();
        await this.doClick(this.btnRun, "Clicking Run button");
        await this.driver.switchTo().defaultContent();
    }
    async navigateToDBXMLImportResultsPage(sFile, sTransactionCode) {
        await this.setBrowseInputXmlFile(sFile);
        await this.setTransactionCode(sTransactionCode);
        await this.clickRun();
        return new ImportDBXmlResultsPage_1.ImportDBXmlResultsPage(this.driver, this.logFile);
    }
}
exports.ImportDBXmlPage = ImportDBXmlPage;
