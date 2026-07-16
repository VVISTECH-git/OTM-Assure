import { By } from "selenium-webdriver";
import { Page } from "../util/Page";


export class ContactsPopup extends Page {

  private sTitle = "Contacts";


  private frame = By.xpath('//frame[@title="Content"]');
  private btnSearchIcon = By.xpath('//span[text()="Search"]');


  public async isPageLoaded() {
    await this.waitUntilPageTitleContains(this.sTitle);
    await this.doSwitchToFrame(this.frame)
    await this.waitUntilElementLocated(this.btnSearchIcon);
  }

}
