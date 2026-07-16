"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserCeationPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../util/Page");
class UserCeationPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "User";
        this.tfldUserName = selenium_webdriver_1.By.xpath('//input[@name="gl_user/xid"]');
        this.tfldNickName = selenium_webdriver_1.By.xpath('//input[@name="gl_user/username"]');
        this.tfldDomainName = selenium_webdriver_1.By.xpath('//input[@name="gl_user/domain_name"]');
        this.tfldPassword = selenium_webdriver_1.By.xpath('//input[@name="gl_user/gl_password"]');
        this.tfldRetypePassword = selenium_webdriver_1.By.xpath('//input[@name="gl_password2"]');
        this.btnFinsih = selenium_webdriver_1.By.xpath('//button[@name="finished_button"]');
        this.tfldAccountPolicy = selenium_webdriver_1.By.xpath('//input[@name="gl_user/gl_account_policy_xid"]');
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.tfldUserName);
    }
    async setAccountPolicy(sValue) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldAccountPolicy, sValue, "Entering Account Policy " + sValue);
        await this.doSwitchToDefaultContent();
    }
    async setUserName(sUserName) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldUserName, sUserName, "Entering UserName " + sUserName);
        await this.doSwitchToDefaultContent();
    }
    async setNickName(sNickName) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldNickName, sNickName, "Entering NickName " + sNickName);
        await this.doSwitchToDefaultContent();
    }
    async setDomainName(sDomainName) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldDomainName, sDomainName, "Entering DomainName " + sDomainName);
        await this.doSwitchToDefaultContent();
    }
    async setPassword(sPwd) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldPassword, sPwd, "Entering Passowrd " + sPwd);
        await this.doSwitchToDefaultContent();
    }
    async setRetypePassword(sPwd) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldRetypePassword, sPwd, "Entering Passowrd " + sPwd);
        await this.doSwitchToDefaultContent();
    }
    async clickFinish() {
        await this.isPageLoaded();
        await this.doClick(this.btnFinsih, "Clicking Finish Link");
        await this.doSwitchToDefaultContent();
    }
    async createUser(sDomainName, sUserName, sPassword, sNickName) {
        await this.setUserName(sUserName);
        await this.setNickName(sNickName);
        await this.setDomainName(sDomainName);
        await this.setPassword(sPassword);
        await this.setRetypePassword(sPassword);
        await this.setAccountPolicy("");
        await this.clickFinish();
    }
}
exports.UserCeationPage = UserCeationPage;
