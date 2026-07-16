import { WebElement, By, until } from "selenium-webdriver";
import { OJETActions } from "../Util/OJETActions";
import { CommonFunctions } from "../util/CommonFunctions";


export class RateLoadDefinationsPage extends OJETActions {

  private sTitle = "Rate Load Definitions";

  private frameID = By.xpath("//iframe[@id='mainIFrame']");
  private tfldRLDID = By.xpath("//oj-input-text[contains(@value,'rateLoadDefinitionId')]");
  private tfldTemplateROID = By.xpath("//oj-combobox-one[@id='templateRateOfferingId']");
  private slctDomain = By.xpath("//span[text()='Domain Name']/ancestor::oj-label/parent::div/following-sibling::div//oj-select-single");
  private btnSaveAndContinue = By.xpath("//span[text()='Save and Continue']/ancestor::oj-button");
  private btnSaveAndClose = By.xpath("//span[text()='Save and Close']/ancestor::oj-button[@chroming]");
  private lblRLDHeader = By.xpath("//span[text()='Rate Load Definition Header']");
  private tblRateRecords = By.xpath("//h3[text()='Rate Records']/parent::oj-collapsible");
  private lblROStructure = By.xpath("//span[text()='Rate Offering Structure']");
  private lblRRStructure1 = By.xpath("//span[text()='Rate Record Structure 1']");
  private lblRRStructure2 = By.xpath("//span[text()='Rate Record Structure 2']");
  private SearchIconTmpROID = By.xpath("//input[contains(@id,'templateRateOfferingId')]/ancestor::oj-combobox-one/following-sibling::oj-button");
  private frameFinderResult = By.xpath("//iframe[@style][not(@id)]");
  private btnFinish = By.xpath("//span[text()='Finish']");


  public async isPageLoaded() {
    await this.waitUntilPageTitleContains(this.sTitle);
	await this.driver.sleep(3000);
    await this.doSwitchToFrame(this.frameID);
  }

  public async logMessage(strLogLevel: string, strMessage: string) {
    if (strMessage != "") await CommonFunctions.logMessage(strLogLevel, strMessage);
  }

  public async setRLDID(strID: string) {
    await this.isPageLoaded();
    await this.doEnterTextInInputText(this.tfldRLDID, strID, "Entering Rate Load Defination ID :: " + strID, false);
    await this.doSwitchToDefaultContent();
  }

  public async selectDomain(strDomain: string) {
    await this.isPageLoaded();
    await this.doSetValueInSingleSelect(this.slctDomain, strDomain, "Selecting Domain Name :: " + strDomain);
    await this.doSwitchToDefaultContent();
  }

  public async setTemplateRateOfferingID(strID: string) {
    await this.isPageLoaded();
    await this.doEnterValueInComboBox(this.tfldTemplateROID, strID, "Entering Template Rate Offering ID :: " + strID);
    await this.doClickButton(this.SearchIconTmpROID, "Clicking Search Icon on Template Rate Offering ID");
    await this.doSwitchToFrame(this.frameFinderResult);
    await this.doClickElement(await By.xpath("//input[contains(@aria-label,'"+strID+"')]"), "Selecting Checkbox: "+strID);
    await this.doSwitchToDefaultContent();
    await this.isPageLoaded();
    await this.doClick(this.btnFinish, "Clicking Finish Button");
    await this.doSwitchToDefaultContent();
  }

  public async clickSaveAndContinue() {
    await this.isPageLoaded();
    await this.doClickButton(this.btnSaveAndContinue, "Clicking button Save and Continue button");
    await this.doSwitchToDefaultContent();
  }

  public async clickSaveAndClose() {
    await this.isPageLoaded();
    await this.doClickButton(this.btnSaveAndClose, "Clicking button Save and Close button");
    await this.doSwitchToDefaultContent();
  }

  public async createNewRLD(strRLDId: string, strTROId: string) {
    await this.setRLDID(strRLDId);    
    await this.setTemplateRateOfferingID(strTROId);
    await this.clickSaveAndContinue();
    await this.doSwitchToDefaultContent();
  }

  public async validateRLD() {
    let isDisplayed: boolean = await this.isDisplayedRateLoadDefinitionHeader();    
    await this.logMessage("INFO", "Rate Load Definition Header displayed: " + isDisplayed);
    await this.doSwitchToDefaultContent();
    return isDisplayed;
  }

  public async isDisplayedRateLoadDefinitionHeader() {
    await this.isPageLoaded();
    await this.waitUntilElementLocated(this.lblRLDHeader);
    let isDisplay: boolean = await this.isDisplayed(this.lblRLDHeader);
    await this.doSwitchToDefaultContent();
    return isDisplay;
  }

  public async isDisplayedRateRecordsTable() {
    await this.isPageLoaded();
    await this.waitUntilElementLocated(this.tblRateRecords);
    let isDisplay: boolean = await this.isDisplayed(this.tblRateRecords);
    await this.doSwitchToDefaultContent();
    return isDisplay;
  }

  public async navigateToTab(strTab: string) {
    await this.isPageLoaded();
    await this.waitUntilElementLocated(By.xpath("//span[text()='" + strTab + "']"));
    await this.doClick(By.xpath("//span[text()='Rate Offering Structure']"), "Clicking Tab: " + strTab);
    await this.doSwitchToDefaultContent();
  }

  public async isDisplayedRateOfferingStructure() {
    await this.isPageLoaded();
    await this.waitUntilElementLocated(this.lblROStructure);
    await this.doClick(this.lblROStructure, "Clicking Tab Rate Offering Structure");
    let isDisplay: boolean = await this.isDisplayed(this.lblROStructure);
    await this.doSwitchToDefaultContent();
    return isDisplay;
  }

  public async isDisplayedRateRecordStructure1() {
    await this.isPageLoaded();
    await this.waitUntilElementLocated(this.lblRRStructure1);
    await this.doClick(this.lblRRStructure1, "Clicking Tab Rate Record Structure1");
    let isDisplay: boolean = await this.isDisplayed(this.lblRRStructure1);
    await this.doSwitchToDefaultContent();
    return isDisplay;
  }

  public async isDisplayedRateRecordStructure2() {
    await this.isPageLoaded();
    await this.waitUntilElementLocated(this.lblRRStructure2);
    await this.doClick(this.lblRRStructure2, "Clicking Tab Rate Record Structure2");
    let isDisplay: boolean = await this.isDisplayed(this.lblRRStructure2);
    await this.doSwitchToDefaultContent();
    return isDisplay;
  }

}

