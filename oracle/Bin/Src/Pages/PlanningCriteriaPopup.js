"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanningCriteriaPopup = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Popup_1 = require("../util/Popup");
const CreateDirectShipmentEquipmentPromptPopup_1 = require("./CreateDirectShipmentEquipmentPromptPopup");
class PlanningCriteriaPopup extends Popup_1.Popup {
    constructor() {
        super(...arguments);
        this.sTitle = "Planning Criteria";
        this.btnOK = selenium_webdriver_1.By.xpath('//button[@name="ok"]');
    }
    async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.btnOK);
    }
    async changeFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }
    async clickOK() {
        await this.isPageLoaded();
        await this.doClick(this.btnOK, "Clicking OK button");
        await this.doSwitchToDefaultContent();
        await this.changeFocusToParentWindow();
        return await new CreateDirectShipmentEquipmentPromptPopup_1.CreateDirectShipmentEquipmentPromptPopup(this.driver, this.logFile);
    }
}
exports.PlanningCriteriaPopup = PlanningCriteriaPopup;
