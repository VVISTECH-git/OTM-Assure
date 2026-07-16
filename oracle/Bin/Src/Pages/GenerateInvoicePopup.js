"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerateInvoicePopup = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Popup_1 = require("../Util/Popup");
const GenerateInvoiceResultsPopup_1 = require("./GenerateInvoiceResultsPopup");
class GenerateInvoicePopup extends Popup_1.Popup {
    constructor() {
        super(...arguments);
        this.sTitle = "Generate Invoice";
        this.btnCreateInvoice = selenium_webdriver_1.By.xpath('//button[text()="Create Invoice(s)"]');
    }
    async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }
    async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.btnCreateInvoice);
    }
    async clickCreateInvoice() {
        await this.isPageLoaded();
        await this.doClick(this.btnCreateInvoice, "Clicking Create Invoice button");
        await this.doSwitchToDefaultContent();
        await this.moveFocusToParentWindow();
        return await new GenerateInvoiceResultsPopup_1.GenerateInvoiceResultsPopup(this.driver, this.logFile);
    }
}
exports.GenerateInvoicePopup = GenerateInvoicePopup;
