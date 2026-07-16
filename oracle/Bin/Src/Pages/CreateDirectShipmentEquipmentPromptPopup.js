"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateDirectShipmentEquipmentPromptPopup = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Popup_1 = require("../util/Popup");
const BuildShipmentPopup_1 = require("./BuildShipmentPopup");
class CreateDirectShipmentEquipmentPromptPopup extends Popup_1.Popup {
    constructor() {
        super(...arguments);
        this.sTitle = "Create Direct Shipment / Equipment Prompt";
        this.btnOK = selenium_webdriver_1.By.xpath('//button[@id="ok_button"]');
    }
    async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }
    async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.btnOK);
    }
    async clickOK() {
        await this.isPageLoaded();
        await this.doClick(await this.btnOK, "Clicking OK button");
        await this.driver.switchTo().defaultContent();
        await this.moveFocusToParentWindow();
        return await new BuildShipmentPopup_1.BuildShipmentPopup(this.driver, this.logFile);
    }
}
exports.CreateDirectShipmentEquipmentPromptPopup = CreateDirectShipmentEquipmentPromptPopup;
