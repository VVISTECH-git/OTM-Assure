"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OBIEEHomePage = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const Page_1 = require("../util/Page");
class OBIEEHomePage extends Page_1.Page {
    constructor() {
        super(...arguments);
        this.sTitle = "Oracle Analytics Home";
        this.lnkbipHome = selenium_webdriver_1.By.xpath("//span[text()='Home']");
        this.lnkAnalysis = selenium_webdriver_1.By.xpath('//a[@class="CatalogActionLink"]');
        this.lnkCatalog = selenium_webdriver_1.By.xpath('//span[text()="Catalog"]');
        this.lnkTransportationIntelligence = selenium_webdriver_1.By.xpath("(//a[text()='Transportation Intelligence'])[1]");
        this.lnkGlobalTradeIntelligence = selenium_webdriver_1.By.xpath("(//a[text()='Global Trade Intelligence'])[1]");
        this.lnkLogisticsNetworkModelingIntelligence = selenium_webdriver_1.By.xpath("(//a[text()='Logistics Network Modeling Intelligence'])[1]");
    }
    async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.waitUntilElementLocated(this.lnkAnalysis);
        return await true;
    }
    async navigateToCatalogFoldersInOBIEE(sharedFolders) {
        var links = sharedFolders.split(">");
        // Home Link
        await this.doClick(this.lnkbipHome, "Clicking on Home link on BIP Report server");
        // Catalog Folders Link
        await this.doClick(this.lnkCatalog, "Clicking Link Catalog");
        await this.driver.sleep(5000);
        for (let i = 0; i < links.length; i++) {
            var element = await selenium_webdriver_1.By.xpath('//span[text()="' + links[i] + '"]/parent::span/parent::span/img[@class="treeNodeDisclosure"]');
            await this.doClick(element, "Clicking Link Expand: " + links[i]);
            await this.driver.sleep(3 * 1000);
            if (i == links.length - 1) {
                element = await selenium_webdriver_1.By.xpath("//span[text()='" + links[i] + "']");
                await this.doClick(element, "Clicking Link " + links[i]);
            }
            await this.driver.sleep(3 * 1000);
        }
    }
}
exports.OBIEEHomePage = OBIEEHomePage;
