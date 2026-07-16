import { By } from "selenium-webdriver";
import { Page } from "../util/Page";

export class CreateNewDomainResultsPage extends Page {
    private sTitle = "Create New Domain Results";
    private btnReturn = By.xpath('//button[1]');
    private txtConfirmationMsg = By.xpath('//div[contains(@class,"msgLine msgSub")]');
    private frmFrame = By.xpath("//iframe[contains(@src,'glog.webserver.util.QueryResponseServlet')]");

    public async isPageLoaded() {
        await this.waitUntilPageTitleContains(this.sTitle);
        await this.doSwitchToFrame(this.frmFrame);
        await this.waitUntilElementLocated(this.btnReturn);
    }

    public async getConfirmationMessage() {
        await this.isPageLoaded();
        let sMessage = await this.doGetText(this.txtConfirmationMsg, "Reading confirmation message");
        await this.driver.switchTo().defaultContent();
        return sMessage;
    }

    public async clickReturn() {
        await this.isPageLoaded();
        await this.doClick(this.btnReturn, "Clicking Retunr button");
        await this.driver.switchTo().defaultContent();
    }
}

