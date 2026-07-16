"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsPopup = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../Util/Page");
class ContactsPopup extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Contacts";
        this.frame = selenium_webdriver_1.By.xpath('//frame[@title="Content"]');
        this.btnSearchIcon = selenium_webdriver_1.By.xpath('//span[text()="Search"]');
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(this.frame);
        await this.waitUntilElementLocated(this.btnSearchIcon);
    }
}
exports.ContactsPopup = ContactsPopup;
