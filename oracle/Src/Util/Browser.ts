import { By, WebDriver, WebElement } from "selenium-webdriver";
import { CommonFunctions } from "./CommonFunctions";
import { Constants } from "./Constants";
var path = require('path');
export class Browser {

    public static async getDriver(strBrowser: string): Promise<WebDriver> {

        let driver: WebDriver;
        let sBrowser: string = strBrowser.toLowerCase();
        await CommonFunctions.logMessage("INFO", "Running tests on :: " + strBrowser);


        switch (sBrowser) {
            case "chrome":
                driver = await this.getChromeDriver();
                break;
            case "firefox":
                driver = await this.getFireFoxDriver();
                break;
            case "edge":
                driver = await this.getEdgeDriver();
                break;
            default:
                driver = await this.getChromeDriver();
                break;
        }

        await driver.manage().window().maximize();
        return driver;
    }

    private static async getChromeDriver(): Promise<WebDriver> {
        let driver: WebDriver;
        var webdriver = await require('selenium-webdriver');
        var chrome = require("selenium-webdriver/chrome");
        let strDownloadFolder = await require('path').join(process.env.USERPROFILE, "Downloads");
        var chromeCapabilities = await webdriver.Capabilities.chrome();
        var chromeOptions = new chrome.Options();

        let prefs = {
            'download.default_directory': strDownloadFolder,
            'download.prompt_for_download': false,
            'safebrowsing.enabled': true
        }
        chromeOptions.setUserPreferences(prefs);
        // chromeOptions.addArguments("--incognito");
        chromeOptions.addArguments("start-maximized");
        chromeOptions.addArguments("--disable-popup-blocking");
        chromeOptions.addArguments("--disable-gpu");
        chromeOptions.addArguments("--no-sandbox");
        chromeOptions.addArguments("--safebrowsing-disable-download-protection");

        await chromeCapabilities.set('acceptInsecureCerts', true);
        await chromeCapabilities.set('acceptSslCerts', true);

        driver = await new webdriver.Builder().withCapabilities(chromeCapabilities).setChromeOptions(chromeOptions).build();

        // Using Hub
        //driver = await new webdriver.Builder().usingServer('http://localhost:4455/wd/hub').withCapabilities(chromeCapabilities).build();

        return driver;
    }

    private static async getFireFoxDriver(): Promise<WebDriver> {

        let driver: WebDriver;
        var webdriver = require('selenium-webdriver');

        driver = new webdriver.Builder().withCapabilities({
            'browserName': 'firefox',
            acceptSslCerts: true,
            acceptInsecureCerts: true,
            marionette: true
        }).build();
        return driver;
    }

    private static async getEdgeDriver(): Promise<WebDriver> {

        let driver: WebDriver;
        var webdriver = require('selenium-webdriver');

        driver = new webdriver.Builder().forBrowser('MicrosoftEdge').build();
        return driver;
    }

    public static async disableViewPdf(strBrowser: string, driver: WebDriver) {
        await CommonFunctions.loadURL(driver, strBrowser + "://settings/content/pdfDocuments");
        await CommonFunctions.logMessage("INFO", "Disabling Open Pdf in " + strBrowser);
        if (strBrowser == "chrome") {
            let toggleBar: WebElement = await Constants.driver.executeScript("return document.querySelector('body > settings-ui').shadowRoot.querySelector('#main').shadowRoot.querySelector('settings-basic-page').shadowRoot.querySelector('#basicPage > settings-section.expanded > settings-privacy-page').shadowRoot.querySelector('#pages > settings-subpage > div > settings-radio-group > settings-collapse-radio-button:nth-child(1)').shadowRoot.querySelector('#button > div.disc-border')");
            await toggleBar.click();
        } else if (strBrowser == "edge") {
            let toggleBar: WebElement = await driver.findElement(By.xpath("//div[@id='section_pdf']//input[@aria-label='Always download PDF files']"));
            await toggleBar.click();
        }
    }

}