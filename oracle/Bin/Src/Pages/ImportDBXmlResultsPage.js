"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportDBXmlResultsPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../util/Page");
class ImportDBXmlResultsPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Import DB.XML Result";
        this.txtSuccessCount = selenium_webdriver_1.By.xpath('//div[text()="Success Count"]');
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.driver.switchTo().frame(0);
        await this.waitUntilElementLocated(this.txtSuccessCount);
        return true;
    }
}
exports.ImportDBXmlResultsPage = ImportDBXmlResultsPage;
