import { By } from "selenium-webdriver";
import { Page } from "../util/Page";

export class BIPHomePage extends Page {

    private sTitle = "Oracle Analytics Publisher : Home";
    private lnkCatalogFolder = By.linkText("Catalog Folders");
    private lnkbipHome = By.xpath("//span[text()='Home']");
    private lnkAdministration = By.xpath('//div[text()="Administration"]');
    private imgMYProfile = By.xpath("//img[@title='My Profile']");

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.waitUntilElementLocated(this.lnkCatalogFolder);
        return await true;
    }

    public async navigateCatalogFolders(sharedFolders: string): Promise<void> {
        var links = sharedFolders.split(">");

        await this.doClick(this.lnkbipHome, "Clicking on Home link on BIP Report server");
        await this.doClick(this.lnkCatalogFolder, "Clicking Link Catalog Folders");

        for (let i = 1; i < links.length; i++) {
            var element = By.xpath("//div[text()='" + links[i] + "']/parent::td/preceding-sibling::td//img[@alt='Click to expand']");
            await this.doClick(element, "Clicking Link " + links[i]);
            await this.driver.sleep(5 * 1000);
            if (i == links.length - 1) {
                element = By.xpath("//div[text()='" + links[i] + "']");
                await this.doClick(element, "Clicking Link " + links[i]);
            }
            await this.driver.sleep(3 * 1000);
        }
    }


}


