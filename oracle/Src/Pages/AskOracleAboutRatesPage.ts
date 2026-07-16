import { By } from "selenium-webdriver";
import { Page } from "../util/Page";
import { AskOracleAboutRatesResultsPage } from "./AskOracleAboutRatesResultsPage";

export class AskOracleAboutRatesPage extends Page {

    private sTitle = "Ask Oracle About Rates";
    private btnSearch = By.xpath('//button[text()="Search"]');
    private plstSavedQuery = By.xpath('//select[@name="fav_query_name"]');

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.plstSavedQuery);
    }

    public async setSavedQuery(sSavedQuery: string) {
        await this.isPageLoaded();
        await this.doSelect(this.plstSavedQuery, sSavedQuery, "Selecting Saved Query :: " + sSavedQuery);
        await this.driver.sleep(5000);
        await this.doSwitchToDefaultContent();
    }

    public async clickSearch() {
        await this.isPageLoaded();
        await this.doClick(this.btnSearch, "Clicking Saerch button ");
        await this.driver.switchTo().defaultContent();
        return await new AskOracleAboutRatesResultsPage(this.driver, this.logFile);
    }

}

