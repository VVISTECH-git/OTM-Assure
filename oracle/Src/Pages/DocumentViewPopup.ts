import { By } from "selenium-webdriver";
import { Popup } from "../util/Popup";
import { DocumentMessagePopup } from "./DocumentMessagePopup";

export class DocumentViewPopup extends Popup {
    private sTitle = "Document";
    private btnOpen = By.xpath('//button[text()="Open"]');

    public async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }

    public async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.waitUntilElementLocated(this.btnOpen);
    }

    public async clickOpen() {
        await this.isPageLoaded();
        await this.doClick(this.btnOpen, "Clicking Open button ");
        await this.doSwitchToDefaultContent();
        return await new DocumentMessagePopup(this.driver, this.logFile);
    }


}

