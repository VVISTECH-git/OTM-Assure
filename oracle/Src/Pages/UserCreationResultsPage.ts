import { By } from "selenium-webdriver";
import { Page } from "../util/Page";

export class UserCreationResultsPage extends Page {

    private sTitle = "Results";

    private txtConfirmationMsg = By.xpath('(//span[@class="text"])[3]');
    private btnCreateAnother = By.xpath('//button[@name="create_another_button"]');

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.btnCreateAnother);
    }

    public async clickCreateAnother() {
        await this.isPageLoaded();
        await this.doClick(this.btnCreateAnother, "Clicking CreateAnother Link ");
        await this.doSwitchToDefaultContent();
    }

    public async getConfirmationMessage() {
        await this.isPageLoaded();
        let sMessage = await this.doGetText(this.txtConfirmationMsg, "Reading confirmation message");
        await this.driver.switchTo().defaultContent();
        return sMessage;
    }

}

