"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../util/Page");
const HomePage_1 = require("./HomePage");
class LoginPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.strOPCTitle = "Sign In To ORACLE CLOUD";
        this.ipTxtOPCUserName = selenium_webdriver_1.By.id("username");
        this.ipTxtOPCPassword = selenium_webdriver_1.By.id("password");
        this.btnOPCSignIn = selenium_webdriver_1.By.id("signin");
        this.strOCITitle = "Cloud Sign In";
        this.ipTxtOCIUserName = selenium_webdriver_1.By.id("idcs-signin-basic-signin-form-username");
        this.ipTxtOCIPassword = selenium_webdriver_1.By.id("idcs-signin-basic-signin-form-password|input");
        this.btnOCISignIn = selenium_webdriver_1.By.id("idcs-signin-basic-signin-form-submit");
    }
    async isPageLoaded(sInstanceType) {
        if (sInstanceType.includes("OPC"))
            await this.waitUntilPageTitleContains(this.strOPCTitle);
        else if (sInstanceType.includes("OCI"))
            await this.waitUntilPageTitleContains(this.strOCITitle);
    }
    async setUserName(sUserName, sInstanceType) {
        if (sInstanceType.includes("OPC"))
            await this.doEnterText(this.ipTxtOPCUserName, sUserName, "Entering User name : " + sUserName);
        else if (sInstanceType.includes("OCI"))
            await this.doEnterText(this.ipTxtOCIUserName, sUserName, "Entering User name : " + sUserName);
    }
    async setPassword(sPassword, sInstanceType) {
        if (sInstanceType.includes("OPC"))
            await this.doEnterText(this.ipTxtOPCPassword, sPassword, "Entering Password : " + sPassword);
        else if (sInstanceType.includes("OCI"))
            await this.doEnterText(this.ipTxtOCIPassword, sPassword, "Entering Password : " + sPassword);
    }
    async clickLogin(sInstanceType) {
        if (sInstanceType.includes("OPC"))
            await this.doClick(this.btnOPCSignIn, "Clicking Sign In button");
        else if (sInstanceType.includes("OCI"))
            await this.doClick(this.btnOCISignIn, "Clicking Sign In button");
    }
    async login(sUserName, sPassword, sInstanceType) {
        await this.isPageLoaded(sInstanceType);
        await this.setUserName(sUserName, sInstanceType);
        await this.setPassword(sPassword, sInstanceType);
        await this.clickLogin(sInstanceType);
        return new HomePage_1.HomePage(this.driver, this.logFile);
    }
}
exports.LoginPage = LoginPage;
