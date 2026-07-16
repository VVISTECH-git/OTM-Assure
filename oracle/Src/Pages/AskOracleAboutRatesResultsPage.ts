import { By } from "selenium-webdriver";
import { Page } from "../util/Page";


export class AskOracleAboutRatesResultsPage extends Page {

    private sTitle = "Ask Oracle About Rates";
    private txtRates = By.xpath('//span[text()="Rates"]');

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.txtRates);
    }

    public async getTableColumnValue(sFieldName: string): Promise<string> {
        await this.isPageLoaded();
        let Table = await this.driver.findElements(By.xpath("//table[@summary='Rates']"));

        let tblcnt = 1;
        let sColumnVal = "";
        let BreakOuterLoop = false;
        let colCnt = await this.driver.findElements(By.xpath("//table[@summary='Rates']//tr[@type='header']/th"));

        if (colCnt.length > 0) {
            let ColCnt = 1;
            for (let col of colCnt) {
                let text = await col.getText();
                if (await text.toUpperCase() == sFieldName.toUpperCase()) {
                    sColumnVal = await this.driver.findElement(By.xpath("//table[@summary='Rates']//tr[@class='rowOdd']/td[" + ColCnt + "]")).getText();
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

