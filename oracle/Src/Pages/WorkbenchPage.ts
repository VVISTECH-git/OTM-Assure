import { By } from "selenium-webdriver";
import { OJETActions } from "../util/OJETActions";


export class WorkbenchPage extends OJETActions {

    private sTitle = "Transportation Workbench";
   
    private lblWorkbenchLayout = By.xpath("//li[@id='wb-layout-dropdown']")
    private lblCreateLayout = By.xpath("//h1[text()='Create Layout']");
    private tfldLayoutName = By.xpath("//oj-input-text[@id='layoutNameBox']");
    private tfldDescription = By.xpath("//oj-input-text[@id='layoutDescBox']");
    private slctLogicConfiguration = By.xpath("//oj-select-single[@id='layoutLogicConfBox']");
    private chkbxAutoRefresh = By.xpath("//oj-checkboxset[@id='autoRefreshIntervalCheck']");
    private tfldAutoRefreshInterval = By.xpath("//oj-input-number[@id='layoutAutoRefreshInterval']");
    private sDomain = By.xpath("//span[text()='Domain']/ancestor::oj-select-single");
    private btnOk = By.xpath("(//oj-button[@id='okButton'])[1]");
    private btnCancel = By.xpath("(//oj-button[@id='cancelButton'])[1]");
    private btnDone = By.xpath("//oj-Button[@title='Done']");
    private lblWarning = By.xpath("//h1[text()='Warning']");
    private btnYes = By.xpath("//span[text()='Yes']/ancestor::oj-button");
    private lblMessage = By.xpath("//oj-message")
    private btnEditLayoutButtons = By.xpath("//div[@class='layout-edit-buttons']/a")
    private addContentIcon = By.xpath("//oj-button[@title='Add Content']")
    private editContentIcon = By.xpath("//oj-button[@title='Edit Content']")
    private removeContentIcon = By.xpath("//oj-button[@title='Remove Content']")
    private splitHorizontallyIcon = By.xpath("//oj-button[@title='Split Horizontally']")
    private splitVerticallyIcon = By.xpath("//oj-button[@title='Split Vertically']")


    //Locator Methods

    private getActionNameLocator(strAction: string) { return By.xpath("//span[text()='" + strAction + "']/parent::a"); }
    private getLogicConfigurationLocator(sLogicConfiguration: string) { return By.xpath("//span[text()='" + sLogicConfiguration + "']"); }


    //Methods

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
    }

    public async selectLayoutAction(strAction: string) {
        await this.isPageLoaded();
        strAction == "Workbench Layout" ? await this.doClick(this.lblWorkbenchLayout, "Selecting Action: " + strAction) : await this.doClick(this.getActionNameLocator(strAction), "Selecting Action: " + strAction);
        await this.doSwitchToDefaultContent();
    }

    public async setLayoutName(sLayoutName: string) {
        await this.isPageLoaded();
        await this.waitUntilElementLocated(this.tfldLayoutName);
        await this.doEnterTextInInputText(this.tfldLayoutName, sLayoutName, "Entering Layout Name: " + sLayoutName, false);
        await this.doSwitchToDefaultContent();
    }

    public async setDescription(sDescription: string) {
        await this.isPageLoaded();
        await this.doEnterTextInInputText(this.tfldDescription, sDescription, "Entering Description: " + sDescription, false);
        await this.doSwitchToDefaultContent();
    }

    public async setLogicConfiguration(sLogicConfiguration: string) {
        await this.isPageLoaded();
        await this.doclickInSingleSelect(this.slctLogicConfiguration, "Expanding Logic Configuration Dropdown: " + sLogicConfiguration);
        await this.doClick(this.getLogicConfigurationLocator(sLogicConfiguration), "Selecting Logic Configuration from Dropdown: " + sLogicConfiguration);
        await this.doSwitchToDefaultContent();
    }

    public async setAutoRefresh(refreshInterval: string) {
        await this.doClickCheckboxSet(this.chkbxAutoRefresh, "Selecting the Auto Refresh Checkbox");
        await this.waitUntilElementLocated(this.tfldAutoRefreshInterval);
        if (refreshInterval != "") {
            await this.doEnterTextInInputNumber(this.tfldAutoRefreshInterval, +refreshInterval, "Entering the Auto Refresh Interval: " + refreshInterval);
        }
    }

    public async setDomain(sDomain: string) {
        await this.isPageLoaded();
        await this.doSetValueInSingleSelect(this.sDomain, sDomain, "Selecting Domain: " + sDomain);
        await this.doSwitchToDefaultContent();
    }

    public async clickOK() {
        await this.isPageLoaded();
        await this.doClickButton(this.btnOk, "Clicking OK Button");
        await this.doSwitchToDefaultContent();
    }

    public async clickCancel() {
        await this.isPageLoaded();
        await this.doClickButton(this.btnCancel, "Clicking Cancel Button");
        await this.doSwitchToDefaultContent();
    }

    public async clickDone() {
        await this.isPageLoaded();
        await this.doClickButton(this.btnDone, "Clicking Done Button");
        await this.doSwitchToDefaultContent();
    }
   
    public async clickOKorCancel(strOkOrCancel: boolean) { // true - 'OK' || false - 'Cancel'
        strOkOrCancel == true ? await this.clickOK() : await this.clickCancel();
        await this.doSwitchToDefaultContent();
    }

	public async createLayout(sLayoutName: string, description: string, logicConfiguration: string, okOrCancel: boolean) {
        if ((sLayoutName != "") && (logicConfiguration != "")) {
            await this.selectLayoutAction("Create Layout");
            await this.waitUntilElementLocated(this.lblCreateLayout);
            await this.setLayoutName(sLayoutName);
            await this.setDescription(description);
            await this.setLogicConfiguration(logicConfiguration);            
            await this.clickOKorCancel(okOrCancel)
            await this.doSwitchToDefaultContent();
            return true;
        }
        else {
            await this.logMessage("INFO", "Enter Layout Name and Logic Configuration");
            await this.doSwitchToDefaultContent();
            return false;
        }
    }

    public async verifyEditButtonsDisplays() {
        await this.isPageLoaded();
        await this.doClick(this.btnEditLayoutButtons, "Click Edit Button");
        let addContent: boolean = await this.isDisplayed(this.addContentIcon);
        let editContent: boolean = await this.isDisplayed(this.editContentIcon);
        let removeContent: boolean = await this.isDisplayed(this.removeContentIcon);
        let spliHorizontally: boolean = await this.isDisplayed(this.splitHorizontallyIcon);
        let spliVertically: boolean = await this.isDisplayed(this.splitVerticallyIcon);
        let isDisplayed: boolean = addContent && editContent && removeContent && spliHorizontally && spliVertically;
        await this.logMessage("INFO", "Add Content, Edit Content, Remove Content, Split Horizontally and Split Vertically Icons are getting displayed");
        await this.doSwitchToDefaultContent();
        return isDisplayed;
    }

    public async clickIconSplitHorizontally() {
        await this.isPageLoaded();
        await this.doClickButton(this.splitHorizontallyIcon, "Clicking Icon Split Horizontally");
        await this.doSwitchToDefaultContent();
        return true;
    }

    public async editLayout() {
        await this.isPageLoaded();
        await this.selectLayoutAction("Edit Layout");
        let isDisplayed: boolean = await this.verifyEditButtonsDisplays();
        await this.clickIconSplitHorizontally();
        await this.doSwitchToDefaultContent();
        return isDisplayed;
    }

    public async deleteLayout() {
        await this.isPageLoaded();
        await this.selectLayoutAction("Delete Layout");
        await this.driver.sleep(2000);
        await this.deleteDialogBox();
        return true;
    }

    public async deleteDialogBox() {
        await this.isPageLoaded();
        await this.waitUntilElementLocated(this.lblWarning);
        await this.doClickButton(this.btnYes, "Clicking yes button in the Dialog Box");
        await this.doSwitchToDefaultContent();
    }

    public async getAlertMessage() {
        await this.isPageLoaded();
        let alertText = await this.getMessageSumary(this.lblMessage, "Fetching Alert text");
        await this.logMessage("INFO", "Alert Message: " + alertText);
        await this.doSwitchToDefaultContent();
        return alertText;
    }

}