import { By } from "selenium-webdriver";
import { Page } from "../util/Page";

export class AskOracleAboutDistanceAndTimeResultsPage extends Page {

    private sTitle = "Ask Oracle About Distance and Time Results";
    private txtDistanceTime = By.xpath('//span[contains(text(),"Distance/Time Results")]');

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.txtDistanceTime);
    }

    public async getTableColumnValue(sFieldName: string): Promise<string> {
        await this.isPageLoaded();
        await this.logMessage("INFO", await this.driver.getTitle());
        let Table = await this.driver.findElements(By.xpath("//table[@summary='Distance/Time Results']"));

        let tblcnt = 1;
        let sColumnVal = "";
        let BreakOuterLoop = false;
        let colCnt = await this.driver.findElements(By.xpath("//table[@summary='Distance/Time Results']/thead/tr/td"));
        if (colCnt.length > 0) {
            let ColCnt = 1;
            for (let col of colCnt) {
                let text = await col.getText();
                if (await text.toUpperCase() == sFieldName.toUpperCase()) {
                    sColumnVal = await this.driver.findElement(By.xpath("//table[@summary='Distance/Time Results']/tbody//td[" + ColCnt + "]")).getText();

                    BreakOuterLoop = true;
                    break;
                }
                ColCnt++;
            }
        }
        await this.driver.switchTo().defaultContent();

        return await sColumnVal;
    }

}

