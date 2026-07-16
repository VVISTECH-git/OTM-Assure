import { By } from "selenium-webdriver";
import { Popup } from "../util/Popup";

export class DocumentMessagePopup extends Popup {
    
    private txtContent = By.xpath('//pre');

    public async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[0]);
    }

    public async isPageLoaded() {
        await this.moveFocusToPopup();    
        await this.waitUntilElementLocated(this.txtContent);
    }

    public async getContext() {
        await this.isPageLoaded();
        let sText = await this.doGetText(this.txtContent, "Reading content ");
        await this.doSwitchToDefaultContent();
        return await sText;
    }


}

