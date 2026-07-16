"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Popup = void 0;
const Constants_1 = require("./Constants");
const Page_1 = require("./Page");
const path = require('path');
class Popup extends Page_1.Page {
    constructor(browser, LogFile) {
        super(browser, LogFile);
    }
    async moveFocusToPopup() {
        let sBrowserName = await this.driver.executeScript("return navigator.userAgent", "");
        if (await sBrowserName.toUpperCase().includes("FIREFOX"))
            await this.driver.sleep(Constants_1.Constants.FIREFOX_POPUP_WAITTIME);
        else if (await sBrowserName.toUpperCase().includes("CHROME"))
            await this.driver.sleep(Constants_1.Constants.CHROME_POPUP_WAITTIME);
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[AllWindows.length - 1]);
    }
    async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }
}
exports.Popup = Popup;
