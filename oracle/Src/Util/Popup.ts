import { ThenableWebDriver, Builder, WebElement, WebDriver, By, until } from "selenium-webdriver";
import { Constants } from "./Constants";
import { Page } from "./Page";
const path = require('path');

export class Popup extends Page
{         
     constructor ( browser : WebDriver, LogFile : string ) {
        super ( browser, LogFile );  
    }
    
    public async moveFocusToPopup() {           
        let sBrowserName: string = await this.driver.executeScript("return navigator.userAgent","");           
        if (await sBrowserName.toUpperCase().includes("FIREFOX"))
           await this.driver.sleep(Constants.FIREFOX_POPUP_WAITTIME);
            
        else if (await sBrowserName.toUpperCase().includes("CHROME"))
            await this.driver.sleep(Constants.CHROME_POPUP_WAITTIME);
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.switchTo().window(AllWindows[AllWindows.length-1]);
    }
      
    public async moveFocusToParentWindow() {
        let AllWindows = await this.driver.getAllWindowHandles();             
        await this.driver.switchTo().window(AllWindows[0]);
    }
        
}

