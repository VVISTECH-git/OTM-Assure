"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkbenchPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const OJETActions_1 = require("../util/OJETActions");
class WorkbenchPage extends OJETActions_1.OJETActions {
    constructor() {
        super(...arguments);
        this.sTitle = "Transportation Workbench";
        this.lblWorkbenchLayout = selenium_webdriver_1.By.xpath("//li[@id='wb-layout-dropdown']");
        this.lblCreateLayout = selenium_webdriver_1.By.xpath("//h1[text()='Create Layout']");
        this.tfldLayoutName = selenium_webdriver_1.By.xpath("//oj-input-text[@id='layoutNameBox']");
        this.tfldDescription = selenium_webdriver_1.By.xpath("//oj-input-text[@id='layoutDescBox']");
        this.slctLogicConfiguration = selenium_webdriver_1.By.xpath("//oj-select-single[@id='layoutLogicConfBox']");
        this.chkbxAutoRefresh = selenium_webdriver_1.By.xpath("//oj-checkboxset[@id='autoRefreshIntervalCheck']");
        this.tfldAutoRefreshInterval = selenium_webdriver_1.By.xpath("//oj-input-number[@id='layoutAutoRefreshInterval']");
        this.sDomain = selenium_webdriver_1.By.xpath("//span[text()='Domain']/ancestor::oj-select-single");
        this.btnOk = selenium_webdriver_1.By.xpath("(//oj-button[@id='okButton'])[1]");
        this.btnCancel = selenium_webdriver_1.By.xpath("(//oj-button[@id='cancelButton'])[1]");
        this.btnDone = selenium_webdriver_1.By.xpath("//oj-Button[@title='Done']");
        this.lblWarning = selenium_webdriver_1.By.xpath("//h1[text()='Warning']");
        this.btnYes = selenium_webdriver_1.By.xpath("//span[text()='Yes']/ancestor::oj-button");
        this.lblMessage = selenium_webdriver_1.By.xpath("//oj-message");
        this.btnEditLayoutButtons = selenium_webdriver_1.By.xpath("//div[@class='layout-edit-buttons']/a");
        this.addContentIcon = selenium_webdriver_1.By.xpath("//oj-button[@title='Add Content']");
        this.editContentIcon = selenium_webdriver_1.By.xpath("//oj-button[@title='Edit Content']");
        this.removeContentIcon = selenium_webdriver_1.By.xpath("//oj-button[@title='Remove Content']");
        this.splitHorizontallyIcon = selenium_webdriver_1.By.xpath("//oj-button[@title='Split Horizontally']");
        this.splitVerticallyIcon = selenium_webdriver_1.By.xpath("//oj-button[@title='Split Vertically']");
    }
    //Locator Methods
    getActionNameLocator(strAction) { return selenium_webdriver_1.By.xpath("//span[text()='" + strAction + "']/parent::a"); }
    getLogicConfigurationLocator(sLogicConfiguration) { return selenium_webdriver_1.By.xpath("//span[text()='" + sLogicConfiguration + "']"); }
    //Methods
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
    }
    async selectLayoutAction(strAction) {
        await this.isPageLoaded();
        strAction == "Workbench Layout" ? await this.doClick(this.lblWorkbenchLayout, "Selecting Action: " + strAction) : await this.doClick(this.getActionNameLocator(strAction), "Selecting Action: " + strAction);
        await this.doSwitchToDefaultContent();
    }
    async setLayoutName(sLayoutName) {
        await this.isPageLoaded();
        await this.waitUntilElementLocated(this.tfldLayoutName);
        await this.doEnterTextInInputText(this.tfldLayoutName, sLayoutName, "Entering Layout Name: " + sLayoutName, false);
        await this.doSwitchToDefaultContent();
    }
    async setDescription(sDescription) {
        await this.isPageLoaded();
        await this.doEnterTextInInputText(this.tfldDescription, sDescription, "Entering Description: " + sDescription, false);
        await this.doSwitchToDefaultContent();
    }
    async setLogicConfiguration(sLogicConfiguration) {
        await this.isPageLoaded();
        await this.doclickInSingleSelect(this.slctLogicConfiguration, "Expanding Logic Configuration Dropdown: " + sLogicConfiguration);
        await this.doClick(this.getLogicConfigurationLocator(sLogicConfiguration), "Selecting Logic Configuration from Dropdown: " + sLogicConfiguration);
        await this.doSwitchToDefaultContent();
    }
    async setAutoRefresh(refreshInterval) {
        await this.doClickCheckboxSet(this.chkbxAutoRefresh, "Selecting the Auto Refresh Checkbox");
        await this.waitUntilElementLocated(this.tfldAutoRefreshInterval);
        if (refreshInterval != "") {
            await this.doEnterTextInInputNumber(this.tfldAutoRefreshInterval, +refreshInterval, "Entering the Auto Refresh Interval: " + refreshInterval);
        }
    }
    async setDomain(sDomain) {
        await this.isPageLoaded();
        await this.doSetValueInSingleSelect(this.sDomain, sDomain, "Selecting Domain: " + sDomain);
        await this.doSwitchToDefaultContent();
    }
    async clickOK() {
        await this.isPageLoaded();
        await this.doClickButton(this.btnOk, "Clicking OK Button");
        await this.doSwitchToDefaultContent();
    }
    async clickCancel() {
        await this.isPageLoaded();
        await this.doClickButton(this.btnCancel, "Clicking Cancel Button");
        await this.doSwitchToDefaultContent();
    }
    async clickDone() {
        await this.isPageLoaded();
        await this.doClickButton(this.btnDone, "Clicking Done Button");
        await this.doSwitchToDefaultContent();
    }
    async clickOKorCancel(strOkOrCancel) {
        strOkOrCancel == true ? await this.clickOK() : await this.clickCancel();
        await this.doSwitchToDefaultContent();
    }
    async createLayout(sLayoutName, description, logicConfiguration, okOrCancel) {
        if ((sLayoutName != "") && (logicConfiguration != "")) {
            await this.selectLayoutAction("Create Layout");
            await this.waitUntilElementLocated(this.lblCreateLayout);
            await this.setLayoutName(sLayoutName);
            await this.setDescription(description);
            await this.setLogicConfiguration(logicConfiguration);
            await this.clickOKorCancel(okOrCancel);
            await this.doSwitchToDefaultContent();
            return true;
        }
        else {
            await this.logMessage("INFO", "Enter Layout Name and Logic Configuration");
            await this.doSwitchToDefaultContent();
            return false;
        }
    }
    async verifyEditButtonsDisplays() {
        await this.isPageLoaded();
        await this.doClick(this.btnEditLayoutButtons, "Click Edit Button");
        let addContent = await this.isDisplayed(this.addContentIcon);
        let editContent = await this.isDisplayed(this.editContentIcon);
        let removeContent = await this.isDisplayed(this.removeContentIcon);
        let spliHorizontally = await this.isDisplayed(this.splitHorizontallyIcon);
        let spliVertically = await this.isDisplayed(this.splitVerticallyIcon);
        let isDisplayed = addContent && editContent && removeContent && spliHorizontally && spliVertically;
        await this.logMessage("INFO", "Add Content, Edit Content, Remove Content, Split Horizontally and Split Vertically Icons are getting displayed");
        await this.doSwitchToDefaultContent();
        return isDisplayed;
    }
    async clickIconSplitHorizontally() {
        await this.isPageLoaded();
        await this.doClickButton(this.splitHorizontallyIcon, "Clicking Icon Split Horizontally");
        await this.doSwitchToDefaultContent();
        return true;
    }
    async editLayout() {
        await this.isPageLoaded();
        await this.selectLayoutAction("Edit Layout");
        let isDisplayed = await this.verifyEditButtonsDisplays();
        await this.clickIconSplitHorizontally();
        await this.doSwitchToDefaultContent();
        return isDisplayed;
    }
    async deleteLayout() {
        await this.isPageLoaded();
        await this.selectLayoutAction("Delete Layout");
        await this.driver.sleep(2000);
        await this.deleteDialogBox();
        return true;
    }
    async deleteDialogBox() {
        await this.isPageLoaded();
        await this.waitUntilElementLocated(this.lblWarning);
        await this.doClickButton(this.btnYes, "Clicking yes button in the Dialog Box");
        await this.doSwitchToDefaultContent();
    }
    async getAlertMessage() {
        await this.isPageLoaded();
        let alertText = await this.getMessageSumary(this.lblMessage, "Fetching Alert text");
        await this.logMessage("INFO", "Alert Message: " + alertText);
        await this.doSwitchToDefaultContent();
        return alertText;
    }
}
exports.WorkbenchPage = WorkbenchPage;
