import { By } from "selenium-webdriver";
import { Page } from "../util/Page";

export class OBIEEHomePage extends Page {

    private sTitle = "Oracle Analytics Home";
    private lnkbipHome = By.xpath("//span[text()='Home']");
    private lnkAnalysis = By.xpath('//a[@class="CatalogActionLink"]');
    private lnkCatalog = By.xpath('//span[text()="Catalog"]');
    private lnkTransportationIntelligence = By.xpath("(//a[text()='Transportation Intelligence'])[1]");
    private lnkGlobalTradeIntelligence = By.xpath("(//a[text()='Global Trade Intelligence'])[1]");
    private lnkLogisticsNetworkModelingIntelligence = By.xpath("(//a[text()='Logistics Network Modeling Intelligence'])[1]");

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.waitUntilElementLocated(this.lnkAnalysis);
        return await true;
    }

    public async navigateToCatalogFoldersInOBIEE(sharedFolders: string): Promise<void> {
        var links = sharedFolders.split(">");

        // Home Link
        await this.doClick(this.lnkbipHome, "Clicking on Home link on BIP Report server");
        // Catalog Folders Link
        await this.doClick(this.lnkCatalog, "Clicking Link Catalog");
        await this.driver.sleep(5000);
        for (let i = 0; i < links.length; i++) {
            var element = await By.xpath('//span[text()="' + links[i] + '"]/parent::span/parent::span/img[@class="treeNodeDisclosure"]');
            await this.doClick(element, "Clicking Link Expand: " + links[i]);
            await this.driver.sleep(3 * 1000);
            if (i == links.length - 1) {
                element = await By.xpath("//span[text()='" + links[i] + "']");
                await this.doClick(element, "Clicking Link " + links[i]);
            }
            await this.driver.sleep(3 * 1000);
        }
    }

}


