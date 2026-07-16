"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLoadDefinationsPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const OJETActions_1 = require("../Util/OJETActions");
const CommonFunctions_1 = require("../util/CommonFunctions");
class RateLoadDefinationsPage extends OJETActions_1.OJETActions {
    constructor() {
        super(...arguments);
        this.sTitle = "Rate Load Definitions";
        this.frameID = selenium_webdriver_1.By.xpath("//iframe[@id='mainIFrame']");
        this.tfldRLDID = selenium_webdriver_1.By.xpath("//oj-input-text[contains(@value,'rateLoadDefinitionId')]");
        this.tfldTemplateROID = selenium_webdriver_1.By.xpath("//oj-combobox-one[@id='templateRateOfferingId']");
        this.slctDomain = selenium_webdriver_1.By.xpath("//span[text()='Domain Name']/ancestor::oj-label/parent::div/following-sibling::div//oj-select-single");
        this.btnSaveAndContinue = selenium_webdriver_1.By.xpath("//span[text()='Save and Continue']/ancestor::oj-button");
        this.btnSaveAndClose = selenium_webdriver_1.By.xpath("//span[text()='Save and Close']/ancestor::oj-button[@chroming]");
        this.lblRLDHeader = selenium_webdriver_1.By.xpath("//span[text()='Rate Load Definition Header']");
        this.tblRateRecords = selenium_webdriver_1.By.xpath("//h3[text()='Rate Records']/parent::oj-collapsible");
        this.lblROStructure = selenium_webdriver_1.By.xpath("//span[text()='Rate Offering Structure']");
        this.lblRRStructure1 = selenium_webdriver_1.By.xpath("//span[text()='Rate Record Structure 1']");
        this.lblRRStructure2 = selenium_webdriver_1.By.xpath("//span[text()='Rate Record Structure 2']");
        this.SearchIconTmpROID = selenium_webdriver_1.By.xpath("//input[contains(@id,'templateRateOfferingId')]/ancestor::oj-combobox-one/following-sibling::oj-button");
        this.frameFinderResult = selenium_webdriver_1.By.xpath("//iframe[@style][not(@id)]");
        this.btnFinish = selenium_webdriver_1.By.xpath("//span[text()='Finish']");
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.driver.sleep(3000);
        await this.doSwitchToFrame(this.frameID);
    }
    async logMessage(strLogLevel, strMessage) {
        if (strMessage != "")
            await CommonFunctions_1.CommonFunctions.logMessage(strLogLevel, strMessage);
    }
    async setRLDID(strID) {
        await this.isPageLoaded();
        await this.doEnterTextInInputText(this.tfldRLDID, strID, "Entering Rate Load Defination ID :: " + strID, false);
        await this.doSwitchToDefaultContent();
    }
    async selectDomain(strDomain) {
        await this.isPageLoaded();
        await this.doSetValueInSingleSelect(this.slctDomain, strDomain, "Selecting Domain Name :: " + strDomain);
        await this.doSwitchToDefaultContent();
    }
    async setTemplateRateOfferingID(strID) {
        await this.isPageLoaded();
        await this.doEnterValueInComboBox(this.tfldTemplateROID, strID, "Entering Template Rate Offering ID :: " + strID);
        await this.doClickButton(this.SearchIconTmpROID, "Clicking Search Icon on Template Rate Offering ID");
        await this.doSwitchToFrame(this.frameFinderResult);
        await this.doClickElement(await selenium_webdriver_1.By.xpath("//input[contains(@aria-label,'" + strID + "')]"), "Selecting Checkbox: " + strID);
        await this.doSwitchToDefaultContent();
        await this.isPageLoaded();
        await this.doClick(this.btnFinish, "Clicking Finish Button");
        await this.doSwitchToDefaultContent();
    }
    async clickSaveAndContinue() {
        await this.isPageLoaded();
        await this.doClickButton(this.btnSaveAndContinue, "Clicking button Save and Continue button");
        await this.doSwitchToDefaultContent();
    }
    async clickSaveAndClose() {
        await this.isPageLoaded();
        await this.doClickButton(this.btnSaveAndClose, "Clicking button Save and Close button");
        await this.doSwitchToDefaultContent();
    }
    async createNewRLD(strRLDId, strTROId) {
        await this.setRLDID(strRLDId);
        await this.setTemplateRateOfferingID(strTROId);
        await this.clickSaveAndContinue();
        await this.doSwitchToDefaultContent();
    }
    async validateRLD() {
        let isDisplayed = await this.isDisplayedRateLoadDefinitionHeader();
        await this.logMessage("INFO", "Rate Load Definition Header displayed: " + isDisplayed);
        await this.doSwitchToDefaultContent();
        return isDisplayed;
    }
    async isDisplayedRateLoadDefinitionHeader() {
        await this.isPageLoaded();
        await this.waitUntilElementLocated(this.lblRLDHeader);
        let isDisplay = await this.isDisplayed(this.lblRLDHeader);
        await this.doSwitchToDefaultContent();
        return isDisplay;
    }
    async isDisplayedRateRecordsTable() {
        await this.isPageLoaded();
        await this.waitUntilElementLocated(this.tblRateRecords);
        let isDisplay = await this.isDisplayed(this.tblRateRecords);
        await this.doSwitchToDefaultContent();
        return isDisplay;
    }
    async navigateToTab(strTab) {
        await this.isPageLoaded();
        await this.waitUntilElementLocated(selenium_webdriver_1.By.xpath("//span[text()='" + strTab + "']"));
        await this.doClick(selenium_webdriver_1.By.xpath("//span[text()='Rate Offering Structure']"), "Clicking Tab: " + strTab);
        await this.doSwitchToDefaultContent();
    }
    async isDisplayedRateOfferingStructure() {
        await this.isPageLoaded();
        await this.waitUntilElementLocated(this.lblROStructure);
        await this.doClick(this.lblROStructure, "Clicking Tab Rate Offering Structure");
        let isDisplay = await this.isDisplayed(this.lblROStructure);
        await this.doSwitchToDefaultContent();
        return isDisplay;
    }
    async isDisplayedRateRecordStructure1() {
        await this.isPageLoaded();
        await this.waitUntilElementLocated(this.lblRRStructure1);
        await this.doClick(this.lblRRStructure1, "Clicking Tab Rate Record Structure1");
        let isDisplay = await this.isDisplayed(this.lblRRStructure1);
        await this.doSwitchToDefaultContent();
        return isDisplay;
    }
    async isDisplayedRateRecordStructure2() {
        await this.isPageLoaded();
        await this.waitUntilElementLocated(this.lblRRStructure2);
        await this.doClick(this.lblRRStructure2, "Clicking Tab Rate Record Structure2");
        let isDisplay = await this.isDisplayed(this.lblRRStructure2);
        await this.doSwitchToDefaultContent();
        return isDisplay;
    }
}
exports.RateLoadDefinationsPage = RateLoadDefinationsPage;
