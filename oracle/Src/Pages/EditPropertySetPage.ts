import { By } from "selenium-webdriver";
import { Page } from "../util/Page";


export class PropertySetPage extends Page {

  private sTitle = "Property Set";
  private tfldReasonforChange = By.name('reason');
  private tfldSequenceNumber = By.name('prop_instruction/prop_sequence_num@PRF');
  private tfldKey = By.name('prop_instruction/key');
  private tfldValue = By.name('prop_instruction/value');
  private tfldDescription = By.name('prop_instruction/description');
  private btnSave = By.xpath("//button[text()='Save']");
  private btnFinished = By.xpath("//button[@name='finished_button']");

  public async isPageLoaded() {
    await this.waitUntilPageTitleContains(this.sTitle);
    await this.doSwitchToFrame(0);
    await this.waitUntilElementLocated(this.tfldReasonforChange);
  }

  public async addProperty(SReasonforChange: string, sSequenceNumber: string, sInstruction: string, sKey: string, sValue: string,
    sDescription: string, ClickFinish: boolean) {
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

  public async clickFinished() {
    await this.isPageLoaded();
    await this.doClick(this.btnFinished, "Clicking Finish button");
    await this.doSwitchToDefaultContent();
  }

  public async clickSave() {
    await this.isPageLoaded();
    await this.doScrollToView(this.btnSave);
    await this.driver.sleep(5 * 1000);
    await this.doClick(this.btnSave, "Clicking Save button");
    await this.doSwitchToDefaultContent();
  }

  public async setDescription(sValue: string) {
    await this.isPageLoaded();
    await this.doEnterText(this.tfldDescription, sValue, "Entering Description  : " + sValue);
    await this.doSwitchToDefaultContent();
  }

  public async setReasonforChange(sValue: string) {
    await this.isPageLoaded();
    await this.doEnterText(this.tfldReasonforChange, sValue, "Entering Reason Code  : " + sValue);
    await this.doSwitchToDefaultContent();
  }

  public async setSequenceNumber(sValue: string) {
    await this.isPageLoaded();
    await this.doEnterText(this.tfldSequenceNumber, sValue, "Entering Sequnce Number  : " + sValue);
    await this.doSwitchToDefaultContent();
  }

  public async setInstruction(sValue: string) {
    await this.isPageLoaded();
    await this.doSelectByText("prop_instruction/instruction", sValue, "Selecting Instruction  : " + sValue);
    await this.doSwitchToDefaultContent();
  }

  public async setKey(sValue: string) {
    await this.isPageLoaded();
    await this.doEnterText(this.tfldKey, sValue, "Entering Key : " + sValue);
    await this.doSwitchToDefaultContent();
  }

  public async setValue(sValue: string) {
    await this.isPageLoaded();
    await this.doEnterText(this.tfldValue, sValue, "Entering Value : " + sValue);
    await this.doSwitchToDefaultContent();
  }

}