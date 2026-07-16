import { By } from "selenium-webdriver";
import { Popup } from "../util/Popup";
import { BuildShipmentPopup } from "./BuildShipmentPopup";

export class CreateDirectShipmentEquipmentPromptPopup extends Popup {

    private sTitle = "Create Direct Shipment / Equipment Prompt";
    private btnOK = By.xpath('//button[@id="ok_button"]');

    public async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }

    public async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.btnOK);
    }

    public async clickOK() {
        await this.isPageLoaded();
        await this.doClick(await this.btnOK, "Clicking OK button");
        await this.driver.switchTo().defaultContent();
        await this.moveFocusToParentWindow();
        return await new BuildShipmentPopup(this.driver, this.logFile);
    }

}

