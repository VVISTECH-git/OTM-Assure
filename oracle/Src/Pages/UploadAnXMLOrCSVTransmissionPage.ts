import { By } from "selenium-webdriver";
import { Page } from "../util/Page";

export class UploadAnXMLOrCSVTransmissionPage extends Page {

    private sTitle = "Upload XML/CSV Transmission";
    private btnChooseFile = By.xpath('//input[@name="file"]');
    private btnUpload = By.xpath('//button[text()="Upload"]');

    public async isPageLoaded(sFramePresent: boolean = true) {
        await this.waitUntilPageTitleContains(this.sTitle);
        if (sFramePresent == true) {
            await this.doSwitchToFrame(0);
        }
        return true;
    }

    public async setChooseFile(sFilePath: string, sFramePresent: boolean = true) {
        await this.isPageLoaded(sFramePresent);
        await this.doEnterText(this.btnChooseFile, sFilePath, "Uploading File - " + sFilePath);
        await this.doSwitchToDefaultContent();
    }

    public async clickUpload(sFramePresent: boolean = true) {
        await this.isPageLoaded(sFramePresent);
        await this.doClick(this.btnUpload, "Clicking Upload button");
        await this.doSwitchToDefaultContent();
    }

    public async uploadFile(sFilePath: string, iNoofSecondsToWait: number, sFramePresent: boolean = true) {
        await this.setChooseFile(sFilePath, sFramePresent);
        await this.clickUpload(sFramePresent);
        await this.logMessage("INFO", "Waiting for " + iNoofSecondsToWait + " sec");
        await this.driver.sleep(iNoofSecondsToWait * 1000);
    }

}

