"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinderResultsPage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../Util/Page");
class FinderResultsPage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Result";
        this.chkSelectAll = selenium_webdriver_1.By.xpath("//input[@checked='true']");
        this.btnActions = selenium_webdriver_1.By.xpath('//button[text()="Actions"]');
        this.frmActionMenu = selenium_webdriver_1.By.xpath("//iframe[@name='actionFrame']");
        this.btnEditIcon = selenium_webdriver_1.By.xpath('//input[@alt="Edit"]');
        this.btnViewIcon = selenium_webdriver_1.By.id("rgViewButtonImg");
        this.frmOTM = selenium_webdriver_1.By.xpath('//frame[@name="mainBody"]');
        this.hdTitle = selenium_webdriver_1.By.xpath("//h1[@class='hdTitle']");
        this.frmMainBody = selenium_webdriver_1.By.xpath('//iframe[@id="mainIFrame"]');
    }
    async isPageLoaded(switchToFrame = true, lookForChkSelectAllButton = true, switchToiFrame = false) {
        try {
            await this.waitUntilPageTitleContains(this.sTitle);
            if (switchToFrame) {
                await this.doSwitchToFrame(0);
            }
            if (switchToiFrame) {
                await this.doSwitchToFrame(this.frmOTM);
            }
            if (lookForChkSelectAllButton) {
                await this.waitUntilElementLocated(this.chkSelectAll);
            }
            await this.waitUntilElementLocated(this.hdTitle);
        }
        catch (error) {
            await this.doSwitchToDefaultContent();
            await this.waitUntilPageTitleContains(this.sTitle);
            if (switchToFrame) {
                await this.doSwitchToFrame(this.frmMainBody);
            }
            if (switchToiFrame) {
                await this.doSwitchToFrame(this.frmOTM);
            }
            if (lookForChkSelectAllButton) {
                await this.waitUntilElementLocated(this.chkSelectAll);
            }
            await this.waitUntilElementLocated(this.hdTitle);
        }
        return true;
    }
    async checkSelectAll(switchToFrame = true, lookForChkSelectAllButton = true, switchToiFrame = false) {
        await this.isPageLoaded(switchToFrame, lookForChkSelectAllButton, switchToiFrame);
        await this.doClick(this.chkSelectAll, "Checking all objects");
        await this.doSwitchToDefaultContent();
        return true;
    }
    async clickActions(switchToFrame = true, lookForChkSelectAllButton = true, switchToiFrame = false) {
        await this.isPageLoaded(switchToFrame, lookForChkSelectAllButton, switchToiFrame);
        await this.doClick(this.btnActions, "Clicking Actions Link");
        await this.doSwitchToDefaultContent();
    }
    async switchToActionsFrame() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(selenium_webdriver_1.By.xpath("(//iframe[@id='mainIFrame']) | (//frame[@name='mainBody'])"));
        await this.doSwitchToFrame(this.frmActionMenu);
    }
    async clickEditIcon(switchToFrame = true) {
        await this.isPageLoaded(switchToFrame);
        await this.doClick(this.btnEditIcon, "Clicking Edit Icon Link");
        await this.doSwitchToDefaultContent();
    }
    async navigateToEditPage() {
        await this.clickEditIcon();
    }
    async navigateToViewPage() {
        await this.clickViewIcon();
    }
    async doGetAttributeWebElement(sLocatorID, sAttribute, sLogMessage) {
        await this.logMessage("INFO", sLogMessage);
        var str = await sLocatorID.getAttribute(sAttribute);
        return await str;
    }
    async runAction(sActionLinks, switchToFrame = true, lookForChkSelectAllButton = true, switchToiFrame = false) {
        await this.clickActions(switchToFrame, lookForChkSelectAllButton, switchToiFrame);
        await this.switchToActionsFrame();
        await this.driver.sleep(2 * 1000);
        var Links = sActionLinks.split(">");
        var i, temp = 0;
        var id = "";
        if (Links.length == 1) {
            let sElements = await this.getElement("a", Links[0]);
            await this.doClickWebElement(sElements[0], "Clicking Link " + Links[0]);
            await this.driver.sleep(3 * 1000);
            id = await this.doGetAttributeWebElement(sElements[0], "id", "");
        }
        else if (Links.length >= 1) {
            if (temp == 0) {
                let sElements = await this.getElement("span", Links[0]);
                await this.doClickWebElement(sElements[0], "Clicking Link " + Links[0]);
                await this.driver.sleep(3 * 1000);
                id = await this.driver.findElement(selenium_webdriver_1.By.xpath('//span[text()="' + Links[0] + '"]/parent::td/parent::tr')).getAttribute('id');
                temp = 1;
            }
            if (temp !== 0) {
                for (i = 0; i < Links.length - 2; i++) {
                    await this.doClick(selenium_webdriver_1.By.xpath('//tr[contains(@id,"' + id + '")]/td/span[text()="' + Links[i + 1] + '"]'), "Clicking Link " + Links[i + 1]);
                    await this.driver.sleep(3 * 1000);
                    id = await this.driver.findElement(selenium_webdriver_1.By.xpath('//tr[contains(@id,"' + id + '")]/td/span[text()="' + Links[i + 1] + '"]/parent::td/parent::tr')).getAttribute('id');
                }
            }
        }
        let sLeafLink = Links[Links.length - 1];
        try {
            await this.waitUntilElementLocated(selenium_webdriver_1.By.xpath('//tr[contains(@id,"' + id + '")]/following-sibling::tr//span/a[text()="' + sLeafLink + '"]'));
            let val = await this.driver.findElements(selenium_webdriver_1.By.xpath('//tr[contains(@id,"' + id + '")]/following-sibling::tr//span/a[text()="' + sLeafLink + '"]'));
            if (val.length == 1) {
                await this.doClick(selenium_webdriver_1.By.xpath('//tr[contains(@id,"' + id + '")]/following-sibling::tr//span/a[text()="' + sLeafLink + '"]'), "Clicking Link " + sLeafLink);
            }
            else {
                await this.driver.findElement(selenium_webdriver_1.By.xpath('//tr[contains(@id,"' + id + '") and @class!="nodeCl"]/td/div/table/tbody/tr/td/span[2]/a[text()="' + sLeafLink + '"]'));
                await this.doClick(selenium_webdriver_1.By.xpath('//tr[contains(@id,"' + id + '") and @class!="nodeCl"]/td/div/table/tbody/tr/td/span[2]/a[text()="' + sLeafLink + '"]'), "Clicking Link " + sLeafLink);
            }
        }
        catch (e) {
        }
        await this.driver.switchTo().defaultContent();
        return 1;
    }
    async clickViewIcon(switchToFrame = true) {
        await this.isPageLoaded(switchToFrame);
        await this.doClick(this.btnViewIcon, "Clicking View Icon Link  ");
        await this.doSwitchToDefaultContent();
    }
}
exports.FinderResultsPage = FinderResultsPage;
