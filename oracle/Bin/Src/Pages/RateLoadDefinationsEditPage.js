"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLoadDefinationsEditPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../Util/Page");
class RateLoadDefinationsEditPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Rate Load Definitions";
        this.txtRLDHeader = selenium_webdriver_1.By.xpath('//h1[contains(text(),"Rate Load Definitions")]');
        this.lnkRateOfferingStructureTab = selenium_webdriver_1.By.xpath('//a[contains(text(),"Rate Offering Structure")]');
        this.lnkRateRecordStructureTab = selenium_webdriver_1.By.xpath('(//a[@role="tab" and contains(text(),"Rate Record Structure 1")])[1]');
        this.btnSaveAndClose = selenium_webdriver_1.By.xpath('(//span[contains(text(),"Save and Close")]/parent::a)[1]');
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.txtRLDHeader);
    }
    async getRLDHeaderText() {
        await this.isPageLoaded();
        let sID = await this.doGetText(this.txtRLDHeader, "Reading RLD ID");
        await this.doSwitchToDefaultContent();
        return await sID;
    }
    async clickRateOfferingStructureTab() {
        await this.isPageLoaded();
        let WebElement = this.driver.findElement(this.lnkRateOfferingStructureTab);
        await this.driver.wait(selenium_webdriver_1.until.elementIsVisible(WebElement), 30000);
        await this.doClick(this.lnkRateOfferingStructureTab, "Clicking RateOfferingStructure ");
        await this.driver.sleep(1 * 1000);
        await this.doSwitchToDefaultContent();
    }
    async clickRateRecordStructureTab() {
        await this.isPageLoaded();
        let WebElement = this.driver.findElement(this.lnkRateRecordStructureTab);
        await this.driver.wait(selenium_webdriver_1.until.elementIsVisible(WebElement), 30000);
        await this.doClick(this.lnkRateRecordStructureTab, "Clicking RateRecordStructure1 ");
        await this.driver.sleep(1 * 1000);
        await this.doSwitchToDefaultContent();
    }
    async clickSaveAndClose() {
        await this.isPageLoaded();
        await this.doClick(this.btnSaveAndClose, "Clicking Save And Close");
        await this.doSwitchToDefaultContent();
    }
    async navigateAllLinksAndVerifyRLDHeader(sRLDID) {
        let sTxt = await this.getRLDHeaderText();
        if (await sTxt.includes(sRLDID))
            this.logMessage("INFO", "RLD Creation is successfull " + sTxt);
        else
            this.logMessage("FAIL", "RLD Creation is not successfull " + sTxt);
        await this.clickRateOfferingStructureTab();
        await this.clickRateRecordStructureTab();
        await this.clickSaveAndClose();
    }
}
exports.RateLoadDefinationsEditPage = RateLoadDefinationsEditPage;
