import { By } from "selenium-webdriver";
import { Page } from "../util/Page";
import { ImportDBXmlResultsPage } from "./ImportDBXmlResultsPage";

export class ImportDBXmlPage extends Page {
    private sTitle = "Import DB.XML";
    private btnBrowseInputXmlFile = By.xpath('//input[@name="inputXMLFile"]');
    private plstTransactionCode = By.xpath('//select[@name="transactionCode"]');
    private btnRun = By.xpath('//button[@id="run_button"]');

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.driver.switchTo().frame(0);
        await this.waitUntilElementLocated(this.btnBrowseInputXmlFile);
        return true;
    }

    public async setBrowseInputXmlFile(sFile: string) {
        await this.isPageLoaded();
        await this.doEnterText(this.btnBrowseInputXmlFile, sFile, "Entering file to upload ::" + sFile);
        await this.driver.switchTo().defaultContent();
    }

    public async setTransactionCode(sValue: string) {
        await this.isPageLoaded();
        let strNameAttrib = await this.doGetAttribute(this.plstTransactionCode, 'name', "Capturing name attribute");
        await this.doSelectByText(strNameAttrib, sValue, "Selecting Value ::" + sValue);
        await this.driver.switchTo().defaultContent();
    }

    public async clickRun() {
        await this.isPageLoaded();
        await this.doClick(this.btnRun, "Clicking Run button");
        await this.driver.switchTo().defaultContent();
    }

    public async navigateToDBXMLImportResultsPage(sFile: string, sTransactionCode: string) {
        await this.setBrowseInputXmlFile(sFile);
        await this.setTransactionCode(sTransactionCode);
        await this.clickRun();
        return new ImportDBXmlResultsPage(this.driver, this.logFile);
    }

}

