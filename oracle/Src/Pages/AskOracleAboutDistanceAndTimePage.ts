import { By } from "selenium-webdriver";
import { Page } from "../util/Page";
import { AskOracleAboutDistanceAndTimeResultsPage } from "./AskOracleAboutDistanceAndTimeResultsPage";

export class AskOracleAboutDistanceAndTimePage extends Page {

    private sTitle = "Ask Oracle About Distance and Time";
    private plstRequestType = By.xpath('//select[@name="request_type"]');
    private btnFindDistanceAndTime = By.xpath('//button[text()="Find Distance/Time"]');
    private plstSavedQuery = By.xpath('//select[@name="temp_saved_query_name"]');

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(0);
        await this.waitUntilElementLocated(this.plstRequestType);
    }

    public async setSavedQuery(sSavedQuery: string) {
        await this.isPageLoaded();
        await this.doSelect(this.plstSavedQuery, sSavedQuery, "Selecting Saved Query :: " + sSavedQuery);
        await this.waitUntilElementLocated(this.plstSavedQuery);
        await this.doSwitchToDefaultContent();
    }

    public async clickFindDistanceAndTime() {
        await this.isPageLoaded();
        await this.doClick(this.btnFindDistanceAndTime, "Clicking FindDistanceAndTime button ");
        await this.driver.switchTo().defaultContent();
        return await new AskOracleAboutDistanceAndTimeResultsPage(this.driver, this.logFile);
    }

}

