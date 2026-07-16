import { By } from "selenium-webdriver";
import { Popup } from "../util/Popup";
import { CreateDirectShipmentEquipmentPromptPopup } from "./CreateDirectShipmentEquipmentPromptPopup";

export class PlanningCriteriaPopup extends Popup {
    private sTitle = "Planning Criteria";
    private btnOK = By.xpath('//button[@name="ok"]');

    public async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.btnOK);
    }

    public async changeFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }

    public async clickOK() {
        await this.isPageLoaded();
        await this.doClick(this.btnOK, "Clicking OK button");
        await this.doSwitchToDefaultContent();
        await this.changeFocusToParentWindow();
        return await new CreateDirectShipmentEquipmentPromptPopup(this.driver, this.logFile);
    }

}

