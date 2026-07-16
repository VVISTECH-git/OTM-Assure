"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OJETActions = void 0;
const Page_1 = require("./Page");
const elements_1 = require("@oracle/oraclejet-webdriver/elements");
const CommonFunctions_1 = require("./CommonFunctions");
class OJETActions extends Page_1.Page {
    constructor(browser, LogFile) {
        super(browser, LogFile);
    }
    async logMessage(strLogLevel, strMessage) {
        if (strMessage != "")
            await CommonFunctions_1.CommonFunctions.logMessage(strLogLevel, strMessage);
    }
    async doEnterValueInComboBox(byLocator, strValue, strLogMessage) {
        let socComboBox = await (0, elements_1.ojComboboxOne)(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        await socComboBox.sendKeys(strValue);
    }
    async doSetValueInSingleSelect(byLocator, strValue, strLogMessage) {
        let socSingleSelect = await (0, elements_1.ojSelectSingle)(this.driver, byLocator);
        await this.driver.sleep(2000);
        await this.logMessage("INFO", strLogMessage);
        await socSingleSelect.changeValue(strValue);
    }
    async doclickInSingleSelect(byLocator, strLogMessage) {
        let socSingleSelect = await (0, elements_1.ojSelectSingle)(this.driver, byLocator);
        await this.driver.sleep(2000);
        await this.logMessage("INFO", strLogMessage);
        await socSingleSelect.click();
    }
    async doEnterTextInInputText(byLocator, strValue, strLogMessage, isClear = true) {
        const inputText = await (0, elements_1.ojInputText)(this.driver, byLocator);
        if (isClear == true) {
            await inputText.clear();
        }
        await this.logMessage("INFO", strLogMessage);
        await inputText.changeValue(strValue);
        let value = await inputText.getValue();
        if (value != strValue) {
            await this.logMessage("INFO", "Entering Value failed! Trying again");
            await inputText.changeValue(strValue);
        }
    }
    async doSelectCheckboxSet(byLocator, strLogMessage) {
        let chkBox = await (0, elements_1.ojCheckboxset)(this.driver, byLocator);
        let strState = await chkBox.getAttribute("aria-label");
        if (strState.includes("unselected"))
            await this.doSelectCheckboxSet(byLocator, strLogMessage);
        else
            await this.logMessage("WARNING", "Checkbox is already Selected!!");
        await chkBox.click();
    }
    async doClickCheckboxSet(byLocator, strLogMessage) {
        let chkBox = await (0, elements_1.ojCheckboxset)(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        await chkBox.click();
    }
    async doEnterTextInInputNumber(byLocator, sValue, strLogMessage) {
        const inputNumber = await (0, elements_1.ojInputNumber)(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        await inputNumber.changeValue(sValue);
        let value = await inputNumber.getValue();
        if (value != sValue) {
            await this.logMessage("INFO", "Entering Number failed! Trying again");
            await inputNumber.changeValue(sValue);
        }
    }
    async doClickButton(byLocator, strLogMessage) {
        const objButton = await (0, elements_1.ojButton)(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        await objButton.click();
    }
    async doGetText(byLocator, strLogMessage) {
        let objWebElement = await (0, elements_1.ojWebElement)(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        let sText = await objWebElement.getText();
        return sText;
    }
    async doClick(byLocator, strLogMessage) {
        let objWebElement = await (0, elements_1.ojWebElement)(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        await objWebElement.click();
    }
    async getMessageSumary(byLocator, strLogMessage) {
        let objMessage = await (0, elements_1.ojMessage)(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        let message = await objMessage.getMessage();
        let messageSummary = message['summary'];
        return messageSummary;
    }
}
exports.OJETActions = OJETActions;
