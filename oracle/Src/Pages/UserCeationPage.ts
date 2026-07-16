import { By } from "selenium-webdriver";
import { Page } from "../util/Page";

export class UserCeationPage extends Page {

    private sTitle = "User";
    private tfldUserName = By.xpath('//input[@name="gl_user/xid"]');
    private tfldNickName = By.xpath('//input[@name="gl_user/username"]');
    private tfldDomainName = By.xpath('//input[@name="gl_user/domain_name"]');
    private tfldPassword = By.xpath('//input[@name="gl_user/gl_password"]');
    private tfldRetypePassword = By.xpath('//input[@name="gl_password2"]');
    private btnFinsih = By.xpath('//button[@name="finished_button"]');
    private tfldAccountPolicy = By.xpath('//input[@name="gl_user/gl_account_policy_xid"]');

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.tfldUserName);
    }

    public async setAccountPolicy(sValue: string) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldAccountPolicy, sValue, "Entering Account Policy " + sValue);
        await this.doSwitchToDefaultContent();
    }

    public async setUserName(sUserName: string) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldUserName, sUserName, "Entering UserName " + sUserName);
        await this.doSwitchToDefaultContent();
    }

    public async setNickName(sNickName: string) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldNickName, sNickName, "Entering NickName " + sNickName);
        await this.doSwitchToDefaultContent();
    }

    public async setDomainName(sDomainName: string) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldDomainName, sDomainName, "Entering DomainName " + sDomainName);
        await this.doSwitchToDefaultContent();
    }

    public async setPassword(sPwd: string) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldPassword, sPwd, "Entering Passowrd " + sPwd);
        await this.doSwitchToDefaultContent();
    }

    public async setRetypePassword(sPwd: string) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldRetypePassword, sPwd, "Entering Passowrd " + sPwd);
        await this.doSwitchToDefaultContent();
    }

    public async clickFinish() {
        await this.isPageLoaded();
        await this.doClick(this.btnFinsih, "Clicking Finish Link");
        await this.doSwitchToDefaultContent();
    }

    public async createUser(sDomainName: string, sUserName: string, sPassword: string, sNickName: string) {
        await this.setUserName(sUserName);
        await this.setNickName(sNickName);
        await this.setDomainName(sDomainName);
        await this.setPassword(sPassword);
        await this.setRetypePassword(sPassword);
        await this.setAccountPolicy("");
        await this.clickFinish();
    }


}

