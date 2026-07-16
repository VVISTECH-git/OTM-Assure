import { By } from "selenium-webdriver";
import { Popup } from "../util/Popup";

export class SecuredResourcesPopup extends Popup {
    private sTitle = "Secure Resources";
    private txtTotalActualCost = By.xpath('//span[text()="Total Actual Cost"]');

    public async isPageLoaded() {
        await this.moveFocusToPopup();
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(1);
        await this.waitUntilElementLocated(this.txtTotalActualCost);
    }

    public async getTableColumnValue(sFieldName: string): Promise<string> {
        await this.isPageLoaded();
        let TableCont = await this.driver.findElements(By.xpath("//table"));
        let tblcnt = 1;
        let sColumnVal = "";
        let BreakOuterLoop = false;

        for (let Table of TableCont) {
            let coll = await this.driver.findElements(By.xpath("//table[" + tblcnt + "]/thead/tr/td"));

            if (coll.length > 0) {
                let ColCnt = 1;
                for (let link of coll) {
                    let text = await link.getText();

                    if (await text.toUpperCase() == sFieldName.toUpperCase()) {
                        sColumnVal = await this.driver.findElement(By.xpath("//table[" + tblcnt + "]/tbody//td[" + ColCnt + "]")).getText();
                        BreakOuterLoop = true;
                        break;
                    }
                    ColCnt++;
                }
            }
            if (BreakOuterLoop)
                break;
            tblcnt++;
        }
        await this.driver.switchTo().defaultContent();
        await this.logMessage("INFO", "Reading " + sFieldName + " value form page :: " + sColumnVal);
        return sColumnVal;

    }

}

