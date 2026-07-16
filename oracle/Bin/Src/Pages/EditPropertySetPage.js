"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PropertySetPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../Util/Page");
class PropertySetPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Property Set";
        this.tfldReasonforChange = selenium_webdriver_1.By.name('reason');
        this.tfldSequenceNumber = selenium_webdriver_1.By.name('prop_instruction/prop_sequence_num@PRF');
        this.tfldKey = selenium_webdriver_1.By.name('prop_instruction/key');
        this.tfldValue = selenium_webdriver_1.By.name('prop_instruction/value');
        this.tfldDescription = selenium_webdriver_1.By.name('prop_instruction/description');
        this.btnSave = selenium_webdriver_1.By.xpath("//button[text()='Save']");
        this.btnFinished = selenium_webdriver_1.By.xpath("//button[@name='finished_button']");
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.tfldReasonforChange);
    }
    async addProperty(SReasonforChange, sSequenceNumber, sInstruction, sKey, sValue, sDescription, ClickFinish) {
        await this.setSequenceNumber(sSequenceNumber);
        await this.setInstruction(sInstruction);
        await this.setKey(sKey);
        await this.setValue(sValue);
        await this.setDescription(sDescription);
        await this.driver.sleep(0.5);
        await this.clickSave();
        if (ClickFinish) {
            await this.driver.sleep(0.5);
            await this.setReasonforChange(SReasonforChange);
            await this.driver.sleep(0.5);
            await this.clickFinished();
            await this.driver.sleep(0.5);
        }
    }
    async clickFinished() {
        await this.isPageLoaded();
        await this.doClick(this.btnFinished, "Clicking Finish button");
        await this.doSwitchToDefaultContent();
    }
    async clickSave() {
        await this.isPageLoaded();
        await this.doScrollToView(this.btnSave);
        await this.driver.sleep(5 * 1000);
        await this.doClick(this.btnSave, "Clicking Save button");
        await this.doSwitchToDefaultContent();
    }
    async setDescription(sValue) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldDescription, sValue, "Entering Description  : " + sValue);
        await this.doSwitchToDefaultContent();
    }
    async setReasonforChange(sValue) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldReasonforChange, sValue, "Entering Reason Code  : " + sValue);
        await this.doSwitchToDefaultContent();
    }
    async setSequenceNumber(sValue) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldSequenceNumber, sValue, "Entering Sequnce Number  : " + sValue);
        await this.doSwitchToDefaultContent();
    }
    async setInstruction(sValue) {
        await this.isPageLoaded();
        await this.doSelectByText("prop_instruction/instruction", sValue, "Selecting Instruction  : " + sValue);
        await this.doSwitchToDefaultContent();
    }
    async setKey(sValue) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldKey, sValue, "Entering Key : " + sValue);
        await this.doSwitchToDefaultContent();
    }
    async setValue(sValue) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldValue, sValue, "Entering Value : " + sValue);
        await this.doSwitchToDefaultContent();
    }
}
exports.PropertySetPage = PropertySetPage;
