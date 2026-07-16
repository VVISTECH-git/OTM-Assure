import { By } from "selenium-webdriver";
import { Popup } from "../util/Popup";
import { ResultsPopup } from "./ResultsPopup";

export class OnlineBookingAndTenderingPopup extends Popup {

    private sTitle = "Online Booking/Tendering";
    private btnFinished = By.id('save_button');

    public async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }

    public async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
    }

    public async clickFinished() {
        await this.isPageLoaded();
        await this.doClick(this.btnFinished, "Clicking Finish button");
        await this.doSwitchToDefaultContent();
        await this.moveFocusToParentWindow();
        return await new ResultsPopup(this.driver, this.logFile);
    }


}

