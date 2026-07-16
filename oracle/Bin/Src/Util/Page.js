"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Page = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const CommonFunctions_1 = require("./CommonFunctions");
const Constants_1 = require("./Constants");
const path = require('path');
class Page {
    imgHomePageIcon() { return this.driver.findElement(selenium_webdriver_1.By.xpath("//oj-button[@id='homeButton']")); }
    ;
    constructor(browser, LogFile) {
        this.driver = browser;
        this.logFile = LogFile;
        this.screenShotsFolder = path.join(this.logFile, '..', '..', 'Screenshots', '');
        this.latestScreenShotFileName = "";
    }
    async isDisplayed(byLocator, isSwitchToDefaultContent = false) {
        let webElement;
        let isDisplayed = false;
        try {
            webElement = await this.driver.findElement(byLocator);
            isDisplayed = await webElement.isDisplayed();
        }
        catch (error) {
            await this.logMessage("WARNING", error);
        }
        if (isSwitchToDefaultContent) {
            await this.doSwitchToDefaultContent();
        }
        return isDisplayed;
    }
    async doGetAttribute(sLocatorID, sAttribute, sLogMessage) {
        await this.logMessage("INFO", sLogMessage);
        let WebElement = await this.driver.findElement(sLocatorID);
        return await WebElement.getAttribute(sAttribute);
    }
    async doGetAttributeWebElement(sLocatorID, sAttribute, sLogMessage) {
        await this.logMessage("INFO", sLogMessage);
        var str = await sLocatorID.getAttribute(sAttribute);
        return await str;
    }
    async navigateToHomePage() {
        await this.driver.sleep(5 * 1000);
        await this.driver.wait(selenium_webdriver_1.until.elementIsVisible(this.imgHomePageIcon()), 30000);
        await this.imgHomePageIcon().click();
        await this.driver.sleep(5 * 1000);
    }
    async doGetText(sLoctorID, sLogMessage) {
        if (sLogMessage != "")
            await this.logMessage("INFO", sLogMessage);
        let WebElement = await this.driver.findElement(sLoctorID);
        await this.driver.wait(selenium_webdriver_1.until.elementIsVisible(WebElement), Constants_1.Constants.PAGE_TITLE_TIMEOUT);
        //await WebElement.click ();        
        return await WebElement.getAttribute("textContent");
    }
    async waitUntilElementLocated(Locator) {
        await this.driver.wait(await selenium_webdriver_1.until.elementLocated(Locator), Constants_1.Constants.OBJECT_LOAD_TIMEOUT);
    }
    async waitUntilPageTitleContains(sTitle) {
        await this.driver.wait(await selenium_webdriver_1.until.titleContains(sTitle), Constants_1.Constants.PAGE_TITLE_TIMEOUT);
        await this.logMessage("INFO", "Page title :: " + await this.driver.getTitle());
    }
    async doSwitchToDefaultContent() {
        await this.driver.switchTo().defaultContent();
    }
    async doSwitchToFrame(sNameIndex) {
        if (typeof (sNameIndex) == "number") {
            await this.driver.switchTo().frame(sNameIndex);
        } else if (typeof (sNameIndex) == "object") {
            // Switch by name directly — avoids OJet findElement override which calls
            // whenReady() on the frame element and can hang until the window closes.
            try { await this.driver.switchTo().frame('mainBody'); return; } catch {}
            try { await this.driver.switchTo().frame('mainIFrame'); return; } catch {}
            try { await this.driver.switchTo().frame(0); } catch {}
        }
    }
    async doClickElement(sLoctorID, sLogMessage) {
        await this.logMessage("INFO", sLogMessage);
        let webElement = await this.driver.findElement(sLoctorID);
        await this.driver.wait(selenium_webdriver_1.until.elementIsVisible(webElement), Constants_1.Constants.OBJECT_LOAD_TIMEOUT);
        await webElement.click();
        await this.driver.sleep(0.01 * 1000);
    }
    async doClickWebElement(sLoctorID, sLogMessage) {
        await this.logMessage("INFO", sLogMessage);
        await this.driver.wait(selenium_webdriver_1.until.elementIsVisible(sLoctorID), Constants_1.Constants.OBJECT_LOAD_TIMEOUT);
        await sLoctorID.click();
        await this.driver.sleep(0.01 * 1000);
    }
    async doScrollToView(elementXpath) {
        let element = await this.driver.findElement(elementXpath);
        await this.driver.executeScript("arguments[0].scrollIntoView()", element);
        await this.driver.sleep(3000);
    }
    async doEnterText(sLoctorID, sValue, sLogMessage) {
        await this.logMessage("INFO", sLogMessage);
        let WebElement = await this.driver.findElement(sLoctorID);
        await this.driver.wait(await selenium_webdriver_1.until.elementIsVisible(WebElement), 30000);
        await WebElement.clear();
        await WebElement.sendKeys(sValue);
    }
    async doClick(sLoctorID, sLogMessage) {
        await this.logMessage("INFO", sLogMessage);
        let WebElement = await this.driver.findElement(sLoctorID);
        await this.waitUntilElementLocated(sLoctorID);
        await this.driver.wait(await selenium_webdriver_1.until.elementIsVisible(WebElement), 120000);
        await WebElement.click();
        await this.driver.sleep(0.01 * 1000);
    }
    async getElement(sTagName, sText) {
        let sObjectId = '//' + sTagName + '[text()="' + sText + '"]';
        return this.driver.findElements(selenium_webdriver_1.By.xpath(sObjectId));
    }
    async logMessage(sLogLevel, sMessage) {
        CommonFunctions_1.CommonFunctions.logMessage(sLogLevel, sMessage);
    }
    async doSelect(sLoctorID, sValue, sLogMessage) {
        await this.logMessage("INFO", sLogMessage);
        await this.driver.wait(await selenium_webdriver_1.until.elementIsVisible(await this.driver.findElement(sLoctorID)), 30000);
        await this.driver.sleep(2000);
        await this.driver.findElement(sLoctorID).sendKeys(sValue);
        await this.driver.sleep(3000);
    }
    async doSelectByText(nameAttribute, sValue, sLogMessage) {
        await this.logMessage("INFO", sLogMessage);
        await this.waitUntilElementLocated(selenium_webdriver_1.By.xpath("//select[@name='" + nameAttribute + "']//option[text()='" + sValue.trim() + "']"));
        await (await this.driver.findElement(selenium_webdriver_1.By.xpath("//select[@name='" + nameAttribute + "']//option[text()='" + sValue.trim() + "']"))).click();
        await this.driver.sleep(5000);
    }
}
exports.Page = Page;
