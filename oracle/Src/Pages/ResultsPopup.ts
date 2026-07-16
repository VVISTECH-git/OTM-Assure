import { By } from "selenium-webdriver";
import { Popup } from "../util/Popup";

export class ResultsPopup extends Popup {

    private sTitle = "Results";
    private txtConfirmationMsg = By.xpath('//span[contains(text(),"success")]');

    public async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }

    public async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
    }

    public async getConfirmationMessage() {
        await this.isPageLoaded();
        let sMessage = await this.doGetText(this.txtConfirmationMsg, "Reading confirmation message");
        await this.driver.switchTo().defaultContent();
        return sMessage;
    }

}

