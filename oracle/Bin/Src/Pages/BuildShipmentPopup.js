"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildShipmentPopup = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Popup_1 = require("../util/Popup");
class BuildShipmentPopup extends Popup_1.Popup {
    constructor() {
        super(...arguments);
        this.sTitle = "Shipment";
    }
    async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }
    async isPageLoaded() {
        await this.driver.sleep(10 * 1000);
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
    }
    async getTableColumnValue(sFieldName) {
        await this.isPageLoaded();
        let TableCont = await this.driver.findElements(selenium_webdriver_1.By.xpath("//table"));
        let tblcnt = 1;
        let sColumnVal = "";
        let BreakOuterLoop = false;
        for (let Table of TableCont) {
            let coll = await this.driver.findElements(selenium_webdriver_1.By.xpath("//table[" + tblcnt + "]/thead/tr/td"));
            if (coll.length > 0) {
                let ColCnt = 1;
                for (let link of coll) {
                    let text = await link.getText();
                    if (await text.toUpperCase() == sFieldName.toUpperCase()) {
                        sColumnVal = await this.driver.findElement(selenium_webdriver_1.By.xpath("//table[" + tblcnt + "]/tbody//td[" + ColCnt + "]")).getText();
                        BreakOuterLoop = true;
                        break;
                    }
                    ColCnt++;
                }
            }
            if (BreakOuterLoop)
                break;
            tblcnt++;
        }
        await this.driver.switchTo().defaultContent();
        await this.logMessage("INFO", "Reading " + sFieldName + " value form page :: " + sColumnVal);
        return sColumnVal;
    }
}
exports.BuildShipmentPopup = BuildShipmentPopup;
