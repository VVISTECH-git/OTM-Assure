"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinderPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../Util/Page");
class FinderPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Finder";
        this.tfldXID = selenium_webdriver_1.By.xpath('(//input[contains(@name,"xid")])[2]');
        this.btnSearch = selenium_webdriver_1.By.xpath('//button[@id="search_button"]');
        this.plstSavedQuery = selenium_webdriver_1.By.name('temp_saved_query_name');
        this.btnExecuteQuery = selenium_webdriver_1.By.xpath("//button[text()='Execute Query']");
        this.btnNew = selenium_webdriver_1.By.xpath("//button[@id='new']");
        this.plstOperator = selenium_webdriver_1.By.xpath("(//input[contains(@name,'xid')])[2]/following-sibling::span/select");
        this.frmLocator = selenium_webdriver_1.By.xpath("((//frame[@name='mainBody'])|(//iframe[@id='mainIFrame']))");
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(this.frmLocator);
        await this.waitUntilElementLocated(this.btnSearch);
        return await true;
    }
    async setXID(sXidValue) {
        await this.isPageLoaded();
        await this.doEnterText(this.tfldXID, sXidValue, "Entering XID field Value: " + sXidValue);
        await this.doSwitchToDefaultContent();
    }
    async setOperatorForsearch(temp = 'Begins With') {
        await this.isPageLoaded();
        let sName = await this.doGetAttribute(this.plstOperator, "name", "");
        await this.doSelectByText(sName, temp, "Selecting Operator: " + temp);
        await this.doSwitchToDefaultContent();
    }
    async setSavedQuery(sSavedQuery) {
        await this.isPageLoaded();
        let strNameAttrib = await this.doGetAttribute(this.plstSavedQuery, 'name', "Capturing name attribute");
        await this.doSelectByText(strNameAttrib, sSavedQuery, "Selecting Saved Query  : " + sSavedQuery);
        await this.doSwitchToDefaultContent();
    }
    async clickExecuteQuery() {
        await this.isPageLoaded();
        await this.doClick(this.btnExecuteQuery, "Clicking Execute Query button : ");
        await this.doSwitchToDefaultContent();
    }
    async clickSearch() {
        await this.isPageLoaded();
        await this.doClick(this.btnSearch, "Clicking Search Button : ");
        await this.doSwitchToDefaultContent();
    }
    async navigateToFinderSetResultsPage() {
        await this.clickSearch();
    }
    async navigateToFinderSetResultsPageWithXID(sXID, temp = 'Begins With') {
        await this.setXID(sXID);
        await this.setOperatorForsearch(temp);
        await this.clickSearch();
    }
    async clickNew() {
        await this.isPageLoaded();
        await this.doClick(this.btnNew, "Clicking New Button ");
        await this.doSwitchToDefaultContent();
    }
    async navigateToCreatePage() {
        await this.clickNew();
    }
    async navigateToFinderSetResultsPageWithSavedQuery(sSavedQuery) {
        await this.setSavedQuery(sSavedQuery);
        await this.clickExecuteQuery();
    }
}
exports.FinderPage = FinderPage;
