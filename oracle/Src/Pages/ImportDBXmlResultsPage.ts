import { By } from "selenium-webdriver";
import { Page } from "../util/Page";

export class ImportDBXmlResultsPage extends Page
{
    private sTitle  = "Import DB.XML Result";
    private  txtSuccessCount = By.xpath ('//div[text()="Success Count"]');
   
    public async isPageLoaded () {          
        await this.waitUntilPageTitleContains (this.sTitle);       
        await this.driver.switchTo().frame(0);           
        await this.waitUntilElementLocated (this.txtSuccessCount);        
        return true;
    }

}

