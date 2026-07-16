"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Browser = void 0;
const selenium_webdriver_1 = require("selenium-webdriver");
const CommonFunctions_1 = require("./CommonFunctions");
const Constants_1 = require("./Constants");
var path = require('path');
class Browser {
    static async getDriver(strBrowser) {
        let driver;
        let sBrowser = strBrowser.toLowerCase();
        await CommonFunctions_1.CommonFunctions.logMessage("INFO", "Running tests on :: " + strBrowser);
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
    static async getChromeDriver() {
        let driver;
        var webdriver = await require('selenium-webdriver');
        var chrome = require("selenium-webdriver/chrome");
        let strDownloadFolder = await require('path').join(process.env.USERPROFILE, "Downloads");
        var chromeCapabilities = await webdriver.Capabilities.chrome();
        var chromeOptions = new chrome.Options();
        let prefs = {
            'download.default_directory': strDownloadFolder,
            'download.prompt_for_download': false,
            'safebrowsing.enabled': true
        };
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
    static async getFireFoxDriver() {
        let driver;
        var webdriver = require('selenium-webdriver');
        driver = new webdriver.Builder().withCapabilities({
            'browserName': 'firefox',
            acceptSslCerts: true,
            acceptInsecureCerts: true,
            marionette: true
        }).build();
        return driver;
    }
    static async getEdgeDriver() {
        let driver;
        var webdriver = require('selenium-webdriver');
        driver = new webdriver.Builder().forBrowser('MicrosoftEdge').build();
        return driver;
    }
    static async disableViewPdf(strBrowser, driver) {
        await CommonFunctions_1.CommonFunctions.loadURL(driver, strBrowser + "://settings/content/pdfDocuments");
        await CommonFunctions_1.CommonFunctions.logMessage("INFO", "Disabling Open Pdf in " + strBrowser);
        if (strBrowser == "chrome") {
            let toggleBar = await Constants_1.Constants.driver.executeScript("return document.querySelector('body > settings-ui').shadowRoot.querySelector('#main').shadowRoot.querySelector('settings-basic-page').shadowRoot.querySelector('#basicPage > settings-section.expanded > settings-privacy-page').shadowRoot.querySelector('#pages > settings-subpage > div > settings-radio-group > settings-collapse-radio-button:nth-child(1)').shadowRoot.querySelector('#button > div.disc-border')");
            await toggleBar.click();
        }
        else if (strBrowser == "edge") {
            let toggleBar = await driver.findElement(selenium_webdriver_1.By.xpath("//div[@id='section_pdf']//input[@aria-label='Always download PDF files']"));
            await toggleBar.click();
        }
    }
}
exports.Browser = Browser;
