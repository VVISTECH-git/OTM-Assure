import { WebElement, WebDriver, By, until, Key } from "selenium-webdriver";
import { CommonFunctions } from "./CommonFunctions";
import { Constants } from "./Constants";
import { TestUtil } from "./TestUtil";
const path = require('path');

export class Page {
    public driver: WebDriver;
    public logFile: any;
    public screenShotsFolder: any;
    public latestScreenShotFileName: any;

    public imgHomePageIcon() { return this.driver.findElement(By.xpath("//oj-button[@id='homeButton']")) };

    constructor(browser: WebDriver, LogFile: string) {
        this.driver = browser;
        this.logFile = LogFile;
        this.screenShotsFolder = path.join(this.logFile, '..\\..\\Screenshots\\');
        this.latestScreenShotFileName = "";
    }

    public async isDisplayed(byLocator:By, isSwitchToDefaultContent:boolean = false){
        let webElement;
        let isDisplayed = false;
        try{
            webElement = await this.driver.findElement(byLocator);
            isDisplayed = await webElement.isDisplayed();            
        }catch(error){
            await this.logMessage("WARNING", error);           
        }
        if(isSwitchToDefaultContent){
            await this.doSwitchToDefaultContent();
        }
        return isDisplayed;
    }


    public async doGetAttribute(sLocatorID: By, sAttribute: string, sLogMessage: string): Promise<string> {
        await this.logMessage("INFO", sLogMessage);
        let WebElement = await this.driver.findElement(sLocatorID);
        return await WebElement.getAttribute(sAttribute);
    }

    public async doGetAttributeWebElement(sLocatorID: WebElement, sAttribute: string, sLogMessage: string): Promise<string> {
        await this.logMessage("INFO", sLogMessage);
        var str: string = await sLocatorID.getAttribute(sAttribute);
        return await str;
    }

    public async navigateToHomePage() {
        await this.driver.sleep(5 * 1000);
        await this.driver.wait(until.elementIsVisible(this.imgHomePageIcon()), 30000);
        await this.imgHomePageIcon().click();
        await this.driver.sleep(5 * 1000);
    }

    public async doGetText(sLoctorID: By, sLogMessage: string) {
        if (sLogMessage != "")
            await this.logMessage("INFO", sLogMessage);
        let WebElement = await this.driver.findElement(sLoctorID);
        await this.driver.wait(until.elementIsVisible(WebElement), Constants.PAGE_TITLE_TIMEOUT);
        //await WebElement.click ();        
        return await WebElement.getAttribute("textContent");
    }

    public async waitUntilElementLocated(Locator: By) {
        await this.driver.wait(await until.elementLocated(Locator), Constants.OBJECT_LOAD_TIMEOUT);
    }

    public async waitUntilPageTitleContains(sTitle: string) {
        await this.driver.wait(await until.titleContains(sTitle), Constants.PAGE_TITLE_TIMEOUT);
        await this.logMessage("INFO", "Page title :: " + await this.driver.getTitle());
    }

    public async doSwitchToDefaultContent() {
        await this.driver.switchTo().defaultContent();
    }

    public async doSwitchToFrame(sNameIndex: number | By) {
        if (typeof (sNameIndex) == "number") await this.driver.switchTo().frame(sNameIndex);
        else if (typeof (sNameIndex) == "object") await this.driver.switchTo().frame(this.driver.findElement(sNameIndex));
    }
	
	public async doClickElement(sLoctorID: By, sLogMessage: string) {
        await this.logMessage("INFO", sLogMessage);   
        let webElement = await this.driver.findElement(sLoctorID);
        await this.driver.wait(until.elementIsVisible(webElement), Constants.OBJECT_LOAD_TIMEOUT);
        await webElement.click();
        await this.driver.sleep(0.01 * 1000);
    }

    public async doClickWebElement(sLoctorID: WebElement, sLogMessage: string) {
        await this.logMessage("INFO", sLogMessage);

        await this.driver.wait(until.elementIsVisible(sLoctorID), Constants.OBJECT_LOAD_TIMEOUT);
        await sLoctorID.click();
        await this.driver.sleep(0.01 * 1000);
    }

    public async doScrollToView(elementXpath: By) {
        let element = await this.driver.findElement(elementXpath);
        await this.driver.executeScript("arguments[0].scrollIntoView()", element);
        await this.driver.sleep(3000);
    }

    public async doEnterText(sLoctorID: By, sValue: string, sLogMessage: string) {
        await this.logMessage("INFO", sLogMessage);
        let WebElement = await this.driver.findElement(sLoctorID);
        await this.driver.wait(await until.elementIsVisible(WebElement), 30000);
        await WebElement.clear();
        await WebElement.sendKeys(sValue);
    }

    public async doClick(sLoctorID: By, sLogMessage: string) {
        await this.logMessage("INFO", sLogMessage);
        let WebElement = await this.driver.findElement(sLoctorID);
        await this.waitUntilElementLocated(sLoctorID);
        await this.driver.wait(await until.elementIsVisible(WebElement), 120000);
        await WebElement.click();
        await this.driver.sleep(0.01 * 1000);
    }

    public async getElement(sTagName: string, sText: string): Promise<WebElement[]> {
        let sObjectId = '//' + sTagName + '[text()="' + sText + '"]';
        return this.driver.findElements(By.xpath(sObjectId));
    }

    public async logMessage(sLogLevel: string, sMessage: string) {
        CommonFunctions.logMessage(sLogLevel, sMessage);
    }

    public async doSelect(sLoctorID: By, sValue: string, sLogMessage: string) {
        await this.logMessage("INFO", sLogMessage);
        await this.driver.wait(await until.elementIsVisible(await this.driver.findElement(sLoctorID)), 30000);
        await this.driver.sleep(2000);
        await this.driver.findElement(sLoctorID).sendKeys(sValue);
        await this.driver.sleep(3000);
    }

    public async doSelectByText(nameAttribute: string, sValue: string, sLogMessage: string) {
        await this.logMessage("INFO", sLogMessage);
        await this.waitUntilElementLocated(By.xpath("//select[@name='" + nameAttribute + "']//option[text()='" + sValue.trim() + "']"));
        await (await this.driver.findElement(By.xpath("//select[@name='" + nameAttribute + "']//option[text()='" + sValue.trim() + "']"))).click();
        await this.driver.sleep(5000);
    }

}
