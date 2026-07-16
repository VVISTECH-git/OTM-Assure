import { By } from "selenium-webdriver";
import { Popup } from "../util/Popup";
import { DocumentViewPopup } from "./DocumentViewPopup";

export class UploadDocumentSuccessfulPopup extends Popup {
    private sTitle = "Documents Upload Successful";
    private btnViewDocument = By.xpath('//a[contains(@onclick,"PopupWindow(formatUrl")]');
    private btnViewContent = By.xpath('//button[text()="View Content"]');

    public async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }

    public async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.btnViewContent);
    }

    public async clickViewDocument() {
        await this.isPageLoaded();
        await this.doClick(this.btnViewDocument, "Clicking View Document button ");
        await this.doSwitchToDefaultContent();
        return await new DocumentViewPopup(this.driver, this.logFile);
    }

}

