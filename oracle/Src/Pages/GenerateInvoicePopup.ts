import { By } from "selenium-webdriver";
import { Popup } from "../util/Popup";
import { GenerateInvoiceResultsPopup } from "./GenerateInvoiceResultsPopup";

export class GenerateInvoicePopup extends Popup {
    private sTitle = "Generate Invoice";
    private btnCreateInvoice = By.xpath('//button[text()="Create Invoice(s)"]');

    public async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }

    public async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.btnCreateInvoice);
    }

    public async clickCreateInvoice() {
        await this.isPageLoaded();
        await this.doClick(this.btnCreateInvoice, "Clicking Create Invoice button");
        await this.doSwitchToDefaultContent();
        await this.moveFocusToParentWindow();
        return await new GenerateInvoiceResultsPopup(this.driver, this.logFile);
    }

}

