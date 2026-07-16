import { By } from "selenium-webdriver";
import { Popup } from "../util/Popup";

export class ApproveInvoiceByLinePopup extends Popup {
    private sTitle = "Approve Invoice By Line";
    private txtApproveInvoiceLineHeader = By.xpath('//h1[text()="Approve Invoice By Line"]');

    public async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }

    public async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.txtApproveInvoiceLineHeader);
    }

}

