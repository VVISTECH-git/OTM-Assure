import { By } from "selenium-webdriver";
import { Popup } from "../util/Popup";
import { ApproveInvoiceByLinePopup } from "./ApproveInvoiceByLinePopup";

export class ApproveInvoicePopup extends Popup {
    private sTitle = "Approve Invoice";
    private btnFinish = By.xpath('//button[@name="finish"]');

    public async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }

    public async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.btnFinish);
    }

    public async clickFinish() {
        await this.isPageLoaded();
        await this.doClick(this.btnFinish, "Clicking Finish button");
        await this.doSwitchToDefaultContent();
        await this.moveFocusToParentWindow();
        return await new ApproveInvoiceByLinePopup(this.driver, this.logFile);
    }

}

