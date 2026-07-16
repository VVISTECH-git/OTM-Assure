import { By, until } from "selenium-webdriver";
import { Page } from "../util/Page";


export class RateLoadDefinationsEditPage extends Page {

  private sTitle = "Rate Load Definitions";
  private txtRLDHeader = By.xpath('//h1[contains(text(),"Rate Load Definitions")]');
  private lnkRateOfferingStructureTab = By.xpath('//a[contains(text(),"Rate Offering Structure")]');
  private lnkRateRecordStructureTab = By.xpath('(//a[@role="tab" and contains(text(),"Rate Record Structure 1")])[1]');
  private btnSaveAndClose = By.xpath('(//span[contains(text(),"Save and Close")]/parent::a)[1]');

  public async isPageLoaded() {
    await this.waitUntilPageTitleContains(this.sTitle);
    await this.doSwitchToFrame(0);
    await this.waitUntilElementLocated(this.txtRLDHeader);
  }

  public async getRLDHeaderText() {
    await this.isPageLoaded();
    let sID = await this.doGetText(this.txtRLDHeader, "Reading RLD ID");
    await this.doSwitchToDefaultContent();
    return await sID;
  }

  public async clickRateOfferingStructureTab() {
    await this.isPageLoaded();
    let WebElement = this.driver.findElement(this.lnkRateOfferingStructureTab);
    await this.driver.wait(until.elementIsVisible(WebElement), 30000);
    await this.doClick(this.lnkRateOfferingStructureTab, "Clicking RateOfferingStructure ");
    await this.driver.sleep(1 * 1000);
    await this.doSwitchToDefaultContent();
  }

  public async clickRateRecordStructureTab() {
    await this.isPageLoaded();
    let WebElement = this.driver.findElement(this.lnkRateRecordStructureTab);
    await this.driver.wait(until.elementIsVisible(WebElement), 30000);
    await this.doClick(this.lnkRateRecordStructureTab, "Clicking RateRecordStructure1 ");
    await this.driver.sleep(1 * 1000);
    await this.doSwitchToDefaultContent();
  }

  public async clickSaveAndClose() {
    await this.isPageLoaded();
    await this.doClick(this.btnSaveAndClose, "Clicking Save And Close");
    await this.doSwitchToDefaultContent();
  }

  public async navigateAllLinksAndVerifyRLDHeader(sRLDID: string) {
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
