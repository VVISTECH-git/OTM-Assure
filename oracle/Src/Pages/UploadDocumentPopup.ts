import { By } from "selenium-webdriver";
import { Popup } from "../util/Popup";
import { UploadDocumentSuccessfulPopup } from "./UploadDocumentSuccessfulPopUp";

export class UploadDocumentPopup extends Popup {
    private sTitle = "Upload Document";
    private btnChooseFile = By.name('file');
    private btnUpload = By.xpath('//button[text()="Upload"]');

    public async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }

    public async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.btnUpload);
    }

    public async setChooseFile(sFile: string) {
        await this.isPageLoaded();
        await this.doEnterText(this.btnChooseFile, sFile, "Selecting file for upload :: " + sFile);
        await this.doSwitchToDefaultContent();
    }

    public async clickUpload() {
        await this.isPageLoaded();
        await this.doClick(this.btnUpload, "Clicking Upload button ");
        await this.doSwitchToDefaultContent();
    }

    public async upload(sFile: string) {
        await this.setChooseFile(sFile);
        await this.clickUpload();
        return await new UploadDocumentSuccessfulPopup(this.driver, this.logFile);
    }

}

