import { CommonFunctions } from "./CommonFunctions";
import { WebDriver } from "selenium-webdriver";

var path = require('path');
const fs = require('fs');

export class Constants {
  public static SCRIPT_TIMEOUT;
  public static PAGE_LOAD_TIMEOUT;
  public static OBJECT_LOAD_TIMEOUT;
  public static PAGE_TITLE_TIMEOUT;
  public static CHROME_POPUP_WAITTIME = 5000;
  public static FIREFOX_POPUP_WAITTIME = 8000;
  private static strTempPath = __filename;
  public static PROJECT_FOLDER_NAME = process.cwd();
  public static PROJECT_FOLDER = Constants.strTempPath.substring(0, Constants.strTempPath.indexOf(this.PROJECT_FOLDER_NAME) + this.PROJECT_FOLDER_NAME.length);
  public static envConfig: any;
  public static sURL: string;
  public static sBROWSER: string;
  public static driver: WebDriver;
  public static DBA_USERNAME: string;
  public static DBA_PASSWORD: string;
  public static TEST_CONFIG_FILE: any;
  public static TEST_DATA_FOLDER: string;
  public static TEST_LOG_FOLDER: string;
  public static TEST_LOG_FILE: string;
  public static TEST_SUMMARY_FILE: string;
  public static TEST_DATA_FILE: string;
  public static TEST_DATA_FILE_IN_JSON: string;
  public static TEST_SCREENSHOT_FOLDER: string;
  public static TESTCASE_NAME: string;
  public static TEST_OBJECT: Object;
  public static JSON_DATA: any;

  public static async init_TestConfig(sParentFolderPath: string, sFilePath: string, testObj: Object) {
    let sParentFolder = await path.dirname(sParentFolderPath).split(path.sep).pop();
    this.TESTCASE_NAME = sFilePath.slice(sParentFolderPath.lastIndexOf(path.sep) + 1, sFilePath.length - 3);
    this.TEST_DATA_FOLDER = await path.join(this.PROJECT_FOLDER, "Testdata", sParentFolder);
    this.TEST_CONFIG_FILE = await require(await path.join(this.TEST_DATA_FOLDER, "TestConfig.json"));
    this.TEST_LOG_FOLDER = await path.join(this.PROJECT_FOLDER, "Results", sParentFolder, "Logs");
    this.TEST_LOG_FILE = await path.join(this.TEST_LOG_FOLDER, this.TESTCASE_NAME + ".log");
    this.TEST_SUMMARY_FILE = await path.join(this.PROJECT_FOLDER, "Results", sParentFolder, "Testsummary.txt");
    this.TEST_DATA_FILE = await path.join(this.TEST_DATA_FOLDER, this.TESTCASE_NAME + ".txt");
    this.TEST_DATA_FILE_IN_JSON = await path.join(this.TEST_DATA_FOLDER, this.TESTCASE_NAME + ".json");
    try {
      if (fs.existsSync(Constants.TEST_DATA_FILE_IN_JSON)) {
        this.JSON_DATA = await require(Constants.TEST_DATA_FILE_IN_JSON);
      }
    } catch (err) {
      console.error(err)
    }
    this.TEST_SCREENSHOT_FOLDER = await path.join(this.PROJECT_FOLDER, "Results", sParentFolder, "Screenshots");

    await CommonFunctions.createFolder(path.join("Results", sParentFolder), "Logs,Screenshots");

    this.TEST_OBJECT = testObj;

    this.envConfig = await require(Constants.PROJECT_FOLDER + "\\EnvironmentConfig.json");

    this.sURL = await this.getURL();
    this.sBROWSER = await this.getBrowser();
    this.DBA_USERNAME = await this.envConfig["DBA_USERNAME"];
    this.DBA_PASSWORD = await this.envConfig["DBA_PASSWORD"];
    this.driver = await CommonFunctions.getDriver(this.sBROWSER);
    await this.setTimeouts(this.envConfig.ELEMENT_TIMEOUT, this.envConfig.ELEMENT_TIMEOUT, this.envConfig.ELEMENT_TIMEOUT);
  }

  private static async getURL() {
    let strURL: string = "";
    strURL = await Constants.envConfig["URL"];
    return strURL;
  }

  public static async setTimeouts(intObjectLoadTimeOut: any = "", intPageLoadTimeout: any = "", intScriptTimeout: any = "") {
    if (intObjectLoadTimeOut != "") this.OBJECT_LOAD_TIMEOUT = intObjectLoadTimeOut;
    if (intPageLoadTimeout != "") this.PAGE_LOAD_TIMEOUT = intPageLoadTimeout;
    if (intScriptTimeout != "") this.SCRIPT_TIMEOUT = intScriptTimeout;
    await this.driver.manage().setTimeouts({ implicit: this.OBJECT_LOAD_TIMEOUT, pageLoad: this.PAGE_LOAD_TIMEOUT, script: this.SCRIPT_TIMEOUT });
  }

  public static async getBrowser() {
    let strBrowser = await this.envConfig.BROWSER;
    return strBrowser;
  }

}
