"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BIPHomePage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../util/Page");
class BIPHomePage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Oracle Analytics Publisher : Home";
        this.lnkCatalogFolder = selenium_webdriver_1.By.linkText("Catalog Folders");
        this.lnkbipHome = selenium_webdriver_1.By.xpath("//span[text()='Home']");
        this.lnkAdministration = selenium_webdriver_1.By.xpath('//div[text()="Administration"]');
        this.imgMYProfile = selenium_webdriver_1.By.xpath("//img[@title='My Profile']");
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.waitUntilElementLocated(this.lnkCatalogFolder);
        return await true;
    }
    async navigateCatalogFolders(sharedFolders) {
        var links = sharedFolders.split(">");
        await this.doClick(this.lnkbipHome, "Clicking on Home link on BIP Report server");
        await this.doClick(this.lnkCatalogFolder, "Clicking Link Catalog Folders");
        for (let i = 1; i < links.length; i++) {
            var element = selenium_webdriver_1.By.xpath("//div[text()='" + links[i] + "']/parent::td/preceding-sibling::td//img[@alt='Click to expand']");
            await this.doClick(element, "Clicking Link " + links[i]);
            await this.driver.sleep(5 * 1000);
            if (i == links.length - 1) {
                element = selenium_webdriver_1.By.xpath("//div[text()='" + links[i] + "']");
                await this.doClick(element, "Clicking Link " + links[i]);
            }
            await this.driver.sleep(3 * 1000);
        }
    }
}
exports.BIPHomePage = BIPHomePage;
