import { By } from "selenium-webdriver";
import { Page } from "../util/Page";


export class ViewPage extends Page {

    private sTitle = "Buy Shipment";
    private frmFrameID = By.xpath('//iframe[@id="mainIFrame"]');
    private frmOTM = By.xpath('//frame[@name="mainBody"]');
    private btnActions = By.xpath('//button[text()="Actions"]');
    private frmActionMenu = By.xpath("//iframe[@name='actionFrame']");

    public async isPageLoaded(switchToFrame: boolean = true, switchToiFrame: boolean = false) {
        this.sTitle = await this.driver.getTitle();
        try {
            await this.waitUntilPageTitleContains(await this.sTitle);
            if (switchToFrame) {
                await this.doSwitchToFrame(0);
            }

            if (switchToiFrame) {
                await this.doSwitchToFrame(this.frmOTM);
            }
            
        } catch (error) {
            await this.doSwitchToDefaultContent();
            await this.waitUntilPageTitleContains(await this.sTitle);
            if (switchToFrame) {
                await this.doSwitchToFrame(this.frmFrameID);
            }
            if (switchToiFrame) {
                await this.doSwitchToFrame(this.frmOTM);
            }

        }

        return true;
    }

    public async clickActions(switchToFrame: boolean = true, switchToiFrame: boolean = false) {
        await this.isPageLoaded(switchToFrame, switchToiFrame);
        await this.doClick(this.btnActions, "Clicking Actions Link");
        await this.doSwitchToDefaultContent();
    }

    public async switchToActionsFrame() {
        await this.waitUntilPageTitleContains(await this.sTitle);
        await this.doSwitchToFrame(By.xpath("(//iframe[@id='mainIFrame']) | (//frame[@name='mainBody'])"));
        await this.doSwitchToFrame(this.frmActionMenu);
    }

    public async runAction(sActionLinks: string, switchToFrame: boolean = true, switchToiFrame: boolean = false) {
        await this.isPageLoaded();
		await this.driver.sleep(2 * 1000);
        await this.clickActions(switchToFrame, switchToiFrame);
		await this.driver.sleep(2 * 1000);
        await this.switchToActionsFrame();
        await this.driver.sleep(2 * 1000);

        var Links = sActionLinks.split(">");
        var i, temp: number = 0;
        var id: string = "";

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
                id = await this.driver.findElement(By.xpath('//span[text()="' + Links[0] + '"]/parent::td/parent::tr')).getAttribute('id');

                temp = 1;
            }
            if (temp !== 0) {
                for (i = 0; i < Links.length - 2; i++) {
                    await this.doClick(By.xpath('//tr[contains(@id,"' + id + '")]/td/span[text()="' + Links[i + 1] + '"]'), "Clicking Link " + Links[i + 1]);
                    await this.driver.sleep(3 * 1000);
                    id = await this.driver.findElement(By.xpath('//tr[contains(@id,"' + id + '")]/td/span[text()="' + Links[i + 1] + '"]/parent::td/parent::tr')).getAttribute('id');
                }
            }
        }
        let sLeafLink = Links[Links.length - 1];

        try {
            await this.waitUntilElementLocated(By.xpath('//tr[contains(@id,"' + id + '")]/following-sibling::tr//span/a[text()="' + sLeafLink + '"]'));
            let val = await this.driver.findElements(By.xpath('//tr[contains(@id,"' + id + '")]/following-sibling::tr//span/a[text()="' + sLeafLink + '"]'));

            if (val.length == 1) {

                await this.doClick(By.xpath('//tr[contains(@id,"' + id + '")]/following-sibling::tr//span/a[text()="' + sLeafLink + '"]'), "Clicking Link " + sLeafLink);
            } else {
                await this.driver.findElement(By.xpath('//tr[contains(@id,"' + id + '") and @class!="nodeCl"]/td/div/table/tbody/tr/td/span[2]/a[text()="' + sLeafLink + '"]'));
                await this.doClick(By.xpath('//tr[contains(@id,"' + id + '") and @class!="nodeCl"]/td/div/table/tbody/tr/td/span[2]/a[text()="' + sLeafLink + '"]'), "Clicking Link " + sLeafLink);
            }
        }
        catch (e) {
        }
        await this.driver.switchTo().defaultContent();
        return 1;
    }

}

