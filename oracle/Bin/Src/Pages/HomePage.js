"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomePage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../util/Page");
const Constants_1 = require("../util/Constants");
const elements_1 = require("@oracle/oraclejet-webdriver/elements");
class HomePage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Home";
        this.lnkShipmentManagement = selenium_webdriver_1.By.xpath('//*[text()="Shipment Management"]');
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.waitUntilElementLocated(this.lnkShipmentManagement);
        return await true;
    }
    async doCollapeAllSubMenus() {
        var sExpanedElements = await this.driver.findElements(selenium_webdriver_1.By.xpath("//*[@class='oj-treeview-item oj-expanded']"));
        for (let i = 1; i < sExpanedElements.length; i++) {
            let sMenuOption = await sExpanedElements[i].isDisplayed();
            if (sMenuOption == true) {
                let sidOpenedMenu = await sExpanedElements[i].getAttribute("id");
                let tree1 = await (0, elements_1.ojTreeView)(this.driver, await selenium_webdriver_1.By.xpath("//oj-tree-view"));
                await tree1.doCollapse({ id: sidOpenedMenu });
                break;
            }
        }
    }
    async doExpandAllSubMenus() {
        var arrSubMenuElements = await this.driver.findElements(selenium_webdriver_1.By.xpath("//li[@class='oj-treeview-item oj-collapsed' and contains(@id,'sb')]"));
        for (let i = 0; i < arrSubMenuElements.length; i++) {
            let strSubMenuId = await arrSubMenuElements[i].getAttribute("id");
            let objTree = await (0, elements_1.ojTreeView)(this.driver, await selenium_webdriver_1.By.xpath("//oj-tree-view"));
            let strSubMenu = await arrSubMenuElements[i].getText();
            await this.logMessage("INFO", "Expanding Sub-Menu: " + strSubMenu.trim());
            await objTree.doExpand({ id: strSubMenuId });
        }
    }
    async doOpenMainMenu(sMenu) {
        await this.doClick(selenium_webdriver_1.By.xpath("//div[text()='" + sMenu + "']"), "Clicking on Main Menu: " + sMenu);
    }
    async doOpenSubmenu(sSubMenu) {
        await this.logMessage("INFO", "Clicking link " + sSubMenu);
        let tree1 = await (0, elements_1.ojTreeView)(this.driver, await selenium_webdriver_1.By.xpath("//oj-tree-view"));
        let Elements = await this.driver.findElements(await selenium_webdriver_1.By.xpath("//*[@class='oj-treeview-item-text' and text()='" + sSubMenu + "']"));
        let sSubMenuID = await this.driver.findElement(await selenium_webdriver_1.By.xpath("(//*[@class='oj-treeview-item-text' and text()='" + sSubMenu + "'])[" + Elements.length + "]/ancestor::li[1]")).getAttribute("id");
        await tree1.doExpand({ id: sSubMenuID });
    }
    async doClickMenuItem(sMenuItem) {
        await this.logMessage("INFO", "Clicking link " + sMenuItem);
        let Elements = await this.driver.findElements(await selenium_webdriver_1.By.xpath("//*[text()='" + sMenuItem + "']/ancestor::li[@class='oj-treeview-item oj-treeview-leaf']"));
        for (var i = 0; i < Elements.length; i++) {
            let sVisible = await Elements[i].isDisplayed();
            if (sVisible) {
                await Elements[i].click();
                break;
            }
        }
    }
    async doCloseMainMenu() {
        var sExpanedElements = await this.driver.findElements(selenium_webdriver_1.By.xpath("//button[contains(@id,'clps_btn')]"));
        for (let i = 0; i < sExpanedElements.length; i++) {
            let sMenuOption = await sExpanedElements[i].isDisplayed();
            if (sMenuOption == true) {
                let sOpenedMenus = await this.driver.findElements(selenium_webdriver_1.By.xpath("//button[contains(@id,'clps_btn')]"));
                if (sOpenedMenus.length == 1) {
                    await sOpenedMenus[0].click();
                    break;
                }
            }
        }
    }
    async navigationTo(strPath) {
        await this.isPageLoaded();
        await this.doCollapeAllSubMenus();
        let intOldObjectTimeout = await Constants_1.Constants.OBJECT_LOAD_TIMEOUT;
        let intOldPageLoadTimeout = await Constants_1.Constants.PAGE_LOAD_TIMEOUT;
        await Constants_1.Constants.setTimeouts(6000, 10000);
        await this.doCloseMainMenu();
        await Constants_1.Constants.setTimeouts(intOldObjectTimeout, intOldPageLoadTimeout);
        var strLinks = await strPath.split(">");
        await this.doOpenMainMenu(strLinks[0]);
        if (strLinks.length == 3) {
            await this.doOpenSubmenu(strLinks[1]);
            await this.doClickMenuItem(strLinks[2]);
        }
        else if (strLinks.length == 2) {
            await this.doClickMenuItem(strLinks[1]);
        }
    }
}
exports.HomePage = HomePage;
