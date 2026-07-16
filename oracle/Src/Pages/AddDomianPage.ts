import { By } from "selenium-webdriver";
import { Page } from "../util/Page";

export class AddDomainPage extends Page {
    private sTitle = "Add Domain";

    private tfldDomainName = By.xpath('//input[@name="name"]');
    private tfldPassword = By.xpath('//input[@name="domain_admin_password"]');
    private tfldRetypePassword = By.xpath('//input[@name="domain_admin_password2"]');
    private btnAddDomain = By.xpath('//button[@name="addDomainButton"]');
    private frmFrameID = By.xpath("//iframe[@id='mainIFrame']");

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(this.frmFrameID);
        await this.waitUntilElementLocated(this.tfldDomainName);
    }

    public async clickAddDomain() {
        await this.isPageLoaded();
        await this.doClick(this.btnAddDomain, "Clicking Add Domain Button");
        await this.doSwitchToDefaultContent();
    }

    public async setPassword(sPwd: string) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldPassword, sPwd, "Entering password :: " + sPwd);
        await this.doSwitchToDefaultContent();
    }

    public async setRetypePassword(sPwd: string) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldRetypePassword, sPwd, "Entering password :: " + sPwd);
        await this.doSwitchToDefaultContent();
    }

    public async setDomainName(sDomainName: string) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldDomainName, sDomainName, "Entering domain Name :: " + sDomainName);
        await this.doSwitchToDefaultContent();
    }

    public async createDomian(sDomainName: string, sPassword: string) {
        await this.setDomainName(sDomainName);
        await this.setPassword(sPassword);
        await this.setRetypePassword(sPassword);
        await this.clickAddDomain();
    }

}

