import { By } from "selenium-webdriver";
import { Page } from "../util/Page";
import { HomePage } from "./HomePage";

export class LoginPage extends Page {
    private strOPCTitle = "Sign In To ORACLE CLOUD";
    private ipTxtOPCUserName = By.id("username");
    private ipTxtOPCPassword = By.id("password");
    private btnOPCSignIn = By.id("signin");
    private strOCITitle = "Cloud Sign In";
    private ipTxtOCIUserName = By.id("idcs-signin-basic-signin-form-username");
    private ipTxtOCIPassword = By.id("idcs-signin-basic-signin-form-password|input");
    private btnOCISignIn = By.id("idcs-signin-basic-signin-form-submit");

    public async isPageLoaded(sInstanceType: string) {
        if (sInstanceType.includes("OPC")) await this.waitUntilPageTitleContains(this.strOPCTitle);
        else if (sInstanceType.includes("OCI")) await this.waitUntilPageTitleContains(this.strOCITitle);
    }

    public async setUserName(sUserName: string, sInstanceType: string) {
        if (sInstanceType.includes("OPC")) await this.doEnterText(this.ipTxtOPCUserName, sUserName, "Entering User name : " + sUserName);
        else if (sInstanceType.includes("OCI")) await this.doEnterText(this.ipTxtOCIUserName, sUserName, "Entering User name : " + sUserName);
    }

    public async setPassword(sPassword: string, sInstanceType: string) {
        if (sInstanceType.includes("OPC")) await this.doEnterText(this.ipTxtOPCPassword, sPassword, "Entering Password : " + sPassword);
        else if (sInstanceType.includes("OCI")) await this.doEnterText(this.ipTxtOCIPassword, sPassword, "Entering Password : " + sPassword);
    }

    public async clickLogin(sInstanceType: string) {
        if (sInstanceType.includes("OPC")) await this.doClick(this.btnOPCSignIn, "Clicking Sign In button");
        else if (sInstanceType.includes("OCI")) await this.doClick(this.btnOCISignIn, "Clicking Sign In button");
    }

    public async login(sUserName: string, sPassword: string, sInstanceType: string) {
        await this.isPageLoaded(sInstanceType);
        await this.setUserName(sUserName, sInstanceType);
        await this.setPassword(sPassword, sInstanceType);
        await this.clickLogin(sInstanceType);
        return new HomePage(this.driver, this.logFile);
    }

}

