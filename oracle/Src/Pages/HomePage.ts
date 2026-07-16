import { WebElement, By } from "selenium-webdriver";
import { Page } from "../util/Page";
import { Constants } from "../util/Constants";
import { ojTreeView, OjTreeView } from "@oracle/oraclejet-webdriver/elements";

export class HomePage extends Page {
    public sTitle = "Home";
    private lnkShipmentManagement = By.xpath('//*[text()="Shipment Management"]');

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.waitUntilElementLocated(this.lnkShipmentManagement);
        return await true;
    }

    private async doCollapeAllSubMenus() {
        var sExpanedElements: WebElement[] = await this.driver.findElements(By.xpath("//*[@class='oj-treeview-item oj-expanded']"));
        for (let i = 1; i < sExpanedElements.length; i++) {
            let sMenuOption = await sExpanedElements[i].isDisplayed();
            if (sMenuOption == true) {
                let sidOpenedMenu = await sExpanedElements[i].getAttribute("id");
                let tree1: OjTreeView = await ojTreeView(this.driver, await By.xpath("//oj-tree-view"));
                await tree1.doCollapse({ id: sidOpenedMenu });
                break;
            }
        }
    }

    public async doExpandAllSubMenus() {
        var arrSubMenuElements: WebElement[] = await this.driver.findElements(By.xpath("//li[@class='oj-treeview-item oj-collapsed' and contains(@id,'sb')]"));
        for (let i = 0; i < arrSubMenuElements.length; i++) {
            let strSubMenuId: string = await arrSubMenuElements[i].getAttribute("id");
            let objTree: OjTreeView = await ojTreeView(this.driver, await By.xpath("//oj-tree-view"));
            let strSubMenu: string = await arrSubMenuElements[i].getText();
            await this.logMessage("INFO", "Expanding Sub-Menu: " + strSubMenu.trim());
            await objTree.doExpand({ id: strSubMenuId });
        }
    }

    public async doOpenMainMenu(sMenu: String) {
        await this.doClick(By.xpath("//div[text()='" + sMenu + "']"), "Clicking on Main Menu: " + sMenu);
    }

    public async doOpenSubmenu(sSubMenu: String) {
        await this.logMessage("INFO", "Clicking link " + sSubMenu);
        let tree1: OjTreeView = await ojTreeView(this.driver, await By.xpath("//oj-tree-view"));
        let Elements: WebElement[] = await this.driver.findElements(await By.xpath("//*[@class='oj-treeview-item-text' and text()='" + sSubMenu + "']"));
        let sSubMenuID = await this.driver.findElement(await By.xpath("(//*[@class='oj-treeview-item-text' and text()='" + sSubMenu + "'])[" + Elements.length + "]/ancestor::li[1]")).getAttribute("id");
        await tree1.doExpand({ id: sSubMenuID });
    }

    public async doClickMenuItem(sMenuItem: String) {
        await this.logMessage("INFO", "Clicking link " + sMenuItem);
        let Elements: WebElement[] = await this.driver.findElements(await By.xpath("//*[text()='" + sMenuItem + "']/ancestor::li[@class='oj-treeview-item oj-treeview-leaf']"));
        for (var i = 0; i < Elements.length; i++) {
            let sVisible = await Elements[i].isDisplayed();
            if (sVisible) {
                await Elements[i].click();
                break;
            }
        }

    }

    public async doCloseMainMenu() {
        var sExpanedElements: WebElement[] = await this.driver.findElements(By.xpath("//button[contains(@id,'clps_btn')]"));
        for (let i = 0; i < sExpanedElements.length; i++) {
            let sMenuOption = await sExpanedElements[i].isDisplayed();
            if (sMenuOption == true) {
                let sOpenedMenus: WebElement[] = await this.driver.findElements(By.xpath("//button[contains(@id,'clps_btn')]"));
                if (sOpenedMenus.length == 1) {
                    await sOpenedMenus[0].click();
                    break;
                }
            }
        }

    }

    public async navigationTo(strPath: string) {
        await this.isPageLoaded();
        await this.doCollapeAllSubMenus();
        let intOldObjectTimeout = await Constants.OBJECT_LOAD_TIMEOUT;
        let intOldPageLoadTimeout = await Constants.PAGE_LOAD_TIMEOUT;

        await Constants.setTimeouts(6000, 10000);
        await this.doCloseMainMenu();
        await Constants.setTimeouts(intOldObjectTimeout, intOldPageLoadTimeout);
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

