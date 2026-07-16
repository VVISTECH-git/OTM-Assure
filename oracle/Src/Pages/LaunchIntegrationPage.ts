import { By } from "selenium-webdriver";
import { Page } from "../util/Page";
import { UploadAnXMLOrCSVTransmissionPage } from "./UploadAnXMLOrCSVTransmissionPage";

export class LaunchIntegrationPage extends Page {
    private sTitle = "Launch Integration";
    private lnkUploadAnXMLOrCSVTransmission = By.xpath('//a[text()="Upload an XML/CSV Transmission"]');
    private frmFrameID = By.xpath("//iframe[@id='mainIFrame']");

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(this.frmFrameID);
        await this.waitUntilElementLocated(this.lnkUploadAnXMLOrCSVTransmission);
        return true;
    }

    public async clickkUploadAnXMLOrCSVTransmission() {
        await this.isPageLoaded();
        await this.doClick(this.lnkUploadAnXMLOrCSVTransmission, "Clicking Upload An XML CSV Transmission Link");
        await this.driver.switchTo().defaultContent();

    }

    public async navigateUploadAnCSVOrXMLTransmissionPage() {
        await this.clickkUploadAnXMLOrCSVTransmission();
        return new UploadAnXMLOrCSVTransmissionPage(this.driver, this.logFile);
    }

}

