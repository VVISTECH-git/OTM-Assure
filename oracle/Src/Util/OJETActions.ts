import { WebElement, By, until, WebDriver, Key } from "selenium-webdriver";
import { Page } from "./Page";
import { ojComboboxOne, ojInputText, ojSelectSingle, ojCheckboxset, ojWebElement, ojMenuButton, ojMenu, ojButton, ojConveyorBelt, ojSelector, ojTable, ojInputNumber, ojInputDate, ojDialog, ojInputDateTime, ojMessage } from "@oracle/oraclejet-webdriver/elements";
import { CommonFunctions } from "./CommonFunctions";

export class OJETActions extends Page {

    constructor(browser: WebDriver, LogFile: string) {
        super(browser, LogFile);
    }

    public async logMessage(strLogLevel: string, strMessage: string) {
        if (strMessage != "") await CommonFunctions.logMessage(strLogLevel, strMessage);
    }

    public async doEnterValueInComboBox(byLocator: By, strValue: string, strLogMessage: string) {
        let socComboBox = await ojComboboxOne(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        await socComboBox.sendKeys(strValue);
    }

    public async doSetValueInSingleSelect(byLocator: By, strValue: string, strLogMessage: string) {
        let socSingleSelect = await ojSelectSingle(this.driver, byLocator);
        await this.driver.sleep(2000);
        await this.logMessage("INFO", strLogMessage);
        await socSingleSelect.changeValue(strValue);
    }

    public async doclickInSingleSelect(byLocator: By, strLogMessage: string) {
        let socSingleSelect = await ojSelectSingle(this.driver, byLocator);
        await this.driver.sleep(2000);
        await this.logMessage("INFO", strLogMessage);
        await socSingleSelect.click();
    }

    public async doEnterTextInInputText(byLocator: By, strValue: string, strLogMessage: string, isClear: boolean = true) {
        const inputText = await ojInputText(this.driver, byLocator);
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

    public async doSelectCheckboxSet(byLocator: By, strLogMessage: string) {
        let chkBox = await ojCheckboxset(this.driver, byLocator);
        let strState: string = await chkBox.getAttribute("aria-label");
        if (strState.includes("unselected")) await this.doSelectCheckboxSet(byLocator, strLogMessage);
        else await this.logMessage("WARNING", "Checkbox is already Selected!!");
        await chkBox.click();
    }

    public async doClickCheckboxSet(byLocator: By, strLogMessage: string) { //Helps to select checkbox without any prior condition.
        let chkBox = await ojCheckboxset(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        await chkBox.click();
    }

    public async doEnterTextInInputNumber(byLocator: By, sValue: number, strLogMessage: string) {
        const inputNumber = await ojInputNumber(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        await inputNumber.changeValue(sValue);
        let value = await inputNumber.getValue();
        if (value != sValue) {
            await this.logMessage("INFO", "Entering Number failed! Trying again");
            await inputNumber.changeValue(sValue);
        }
    }

    public async doClickButton(byLocator: By, strLogMessage: string) {
        const objButton = await ojButton(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        await objButton.click();
    }

    public async doGetText(byLocator: By, strLogMessage: string) {
        let objWebElement = await ojWebElement(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        let sText = await objWebElement.getText();
        return sText;
    }

    public async doClick(byLocator: By, strLogMessage: string) {
        let objWebElement = await ojWebElement(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        await objWebElement.click();
    }

    public async getMessageSumary(byLocator: By, strLogMessage: string) {
        let objMessage = await ojMessage(this.driver, byLocator);
        await this.logMessage("INFO", strLogMessage);
        let message = await objMessage.getMessage();
        let messageSummary: string = message['summary'];
        return messageSummary;
    }

}