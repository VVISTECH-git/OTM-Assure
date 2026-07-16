"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddDomainPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../util/Page");
class AddDomainPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Add Domain";
        this.tfldDomainName = selenium_webdriver_1.By.xpath('//input[@name="name"]');
        this.tfldPassword = selenium_webdriver_1.By.xpath('//input[@name="domain_admin_password"]');
        this.tfldRetypePassword = selenium_webdriver_1.By.xpath('//input[@name="domain_admin_password2"]');
        this.btnAddDomain = selenium_webdriver_1.By.xpath('//button[@name="addDomainButton"]');
        this.frmFrameID = selenium_webdriver_1.By.xpath("//iframe[@id='mainIFrame']");
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(this.frmFrameID);
        await this.waitUntilElementLocated(this.tfldDomainName);
    }
    async clickAddDomain() {
        await this.isPageLoaded();
        await this.doClick(this.btnAddDomain, "Clicking Add Domain Button");
        await this.doSwitchToDefaultContent();
    }
    async setPassword(sPwd) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldPassword, sPwd, "Entering password :: " + sPwd);
        await this.doSwitchToDefaultContent();
    }
    async setRetypePassword(sPwd) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldRetypePassword, sPwd, "Entering password :: " + sPwd);
        await this.doSwitchToDefaultContent();
    }
    async setDomainName(sDomainName) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldDomainName, sDomainName, "Entering domain Name :: " + sDomainName);
        await this.doSwitchToDefaultContent();
    }
    async createDomian(sDomainName, sPassword) {
        await this.setDomainName(sDomainName);
        await this.setPassword(sPassword);
        await this.setRetypePassword(sPassword);
        await this.clickAddDomain();
    }
}
exports.AddDomainPage = AddDomainPage;
