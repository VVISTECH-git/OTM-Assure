import { By } from "selenium-webdriver";
import { Page } from "../util/Page";
import { TestUtil } from "../Util/TestUtil";

export class FinderPage extends Page {
    private sTitle = "Finder";
    private tfldXID = By.xpath('(//input[contains(@name,"xid")])[2]');
    private btnSearch = By.xpath('//button[@id="search_button"]');
    private plstSavedQuery = By.name('temp_saved_query_name');
    private btnExecuteQuery = By.xpath("//button[text()='Execute Query']");
    private btnNew = By.xpath("//button[@id='new']");
    private plstOperator = By.xpath("(//input[contains(@name,'xid')])[2]/following-sibling::span/select");
    private frmLocator = By.xpath("((//frame[@name='mainBody'])|(//iframe[@id='mainIFrame']))");

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(this.frmLocator);
        await this.waitUntilElementLocated(this.btnSearch);
        return await true;
    }

    public async setXID(sXidValue: string) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldXID, sXidValue, "Entering XID field Value: " + sXidValue);
        await this.doSwitchToDefaultContent();
    }

    public async setOperatorForsearch(temp: string = 'Begins With') {
        await this.isPageLoaded();
        let sName = await this.doGetAttribute(this.plstOperator, "name", "");
        await this.doSelectByText(sName, temp, "Selecting Operator: " + temp);
        await this.doSwitchToDefaultContent();
    }

    public async setSavedQuery(sSavedQuery: string) {
        await this.isPageLoaded();
        let strNameAttrib = await this.doGetAttribute(this.plstSavedQuery, 'name', "Capturing name attribute");
        await this.doSelectByText(strNameAttrib, sSavedQuery, "Selecting Saved Query  : " + sSavedQuery);
        await this.doSwitchToDefaultContent();
    }

    public async clickExecuteQuery() {
        await this.isPageLoaded();
        await this.doClick(this.btnExecuteQuery, "Clicking Execute Query button : ");
        await this.doSwitchToDefaultContent();
    }

    public async clickSearch() {
        await this.isPageLoaded();
        await this.doClick(this.btnSearch, "Clicking Search Button : ");
        await this.doSwitchToDefaultContent();
    }

    public async navigateToFinderSetResultsPage() {
        await this.clickSearch()
    }

    public async navigateToFinderSetResultsPageWithXID(sXID: string, temp: string = 'Begins With') {
        await this.setXID(sXID);
        await this.setOperatorForsearch(temp);
        await this.clickSearch();
    }

    public async clickNew() {
        await this.isPageLoaded();
        await this.doClick(this.btnNew, "Clicking New Button ");
        await this.doSwitchToDefaultContent();
    }

    public async navigateToCreatePage() {
        await this.clickNew();
    }

    public async navigateToFinderSetResultsPageWithSavedQuery(sSavedQuery: string) {
        await this.setSavedQuery(sSavedQuery);
        await this.clickExecuteQuery();
    }

}

