"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonFunctions = void 0;
const fs = __importStar(require("fs"));
const readline = __importStar(require("readline"));
const selenium_webdriver_1 = require("selenium-webdriver");
const Browser_1 = require("./Browser");
const Constants_1 = require("./Constants");
const path = require('path');
class CommonFunctions {
    static async getDriver(strBrowser) {
        let driver;
        this.strBrowserName = strBrowser;
        driver = await Browser_1.Browser.getDriver(strBrowser);
        return driver;
    }
    static async loadURL(driver, strURL) {
        let count = 1;
        let strTitle = "";
        do {
            await driver.get(strURL);
            strTitle = await driver.getTitle();
            if (strTitle.includes("us.oracle.com") && count != 3) {
                count = count + 1;
                continue;
            }
            else
                break;
        } while (true);
        await driver.sleep(1 * 1000);
    }
    static async takeScreenShot(driver, strScreenShotFolder) {
        let strTimeStamp = await CommonFunctions.getTimeStamp();
        let strFileName = await require('path').join(strScreenShotFolder, strTimeStamp + ".png");
        await driver.takeScreenshot().then(async function (data) {
            let base64Data = data.replace(/^data:image\/png;base64,/, "");
            fs.writeFile(strFileName, base64Data, 'base64', function (error) {
                if (error)
                    console.log(error);
            });
        });
        if (await this.strBrowserName.toUpperCase().includes("CHROME")) {
            let logs = await Constants_1.Constants.driver.manage().logs().get(selenium_webdriver_1.logging.Type.BROWSER);
            for (var i = 0; i < logs.length; i++) {
                let jsonLog = logs[i].toJSON();
                console.log(JSON.stringify(jsonLog));
            }
        }
        var addContext = require('mochawesome/addContext');
        addContext(Constants_1.Constants.TEST_OBJECT, { title: 'Screenshot', value: strFileName });
        return await strFileName;
    }
    static async readDataFromFile(strFileName, strKey) {
        return new Promise(function (resolve, reject) {
            let rl = readline.createInterface({
                input: fs.createReadStream(strFileName)
            });
            let isFound = false;
            rl.on('line', function (line) {
                let keyValuePair = line.split("=");
                if (keyValuePair.includes(strKey)) {
                    isFound = true;
                    resolve(keyValuePair[1]);
                }
            });
            rl.on('close', function () {
                if (!isFound) {
                    reject(strKey + " Not found");
                }
            });
        });
    }
    static async logMessage(sLogLevel, sMessage) {
        let date = new Date();
        switch (sLogLevel) {
            case "INFO":
                sMessage = "[INFO " + date.toLocaleString() + "] " + sMessage;
                break;
            case "PASS":
                sMessage = "[PASS " + date.toLocaleString() + "] " + sMessage;
                break;
            case "FAIL":
                sMessage = "[FAIL " + date.toLocaleString() + "] " + sMessage;
                break;
            case "WARNING":
                sMessage = "[WARNING " + date.toLocaleString() + "] " + sMessage;
                break;
        }
        await console.log(sMessage);
        await fs.appendFile(Constants_1.Constants.TEST_LOG_FILE, sMessage + "\n", (err) => {
            if (err)
                console.log(err);
        });
        var addContext = require('mochawesome/addContext');
        addContext(Constants_1.Constants.TEST_OBJECT, sMessage);
    }
    static async appendToTestSummary(sTestSummaryFile = "", sTestCase = "", sStatus) {
        if ((sStatus.toUpperCase() == "FAILED") || (sStatus == false)) {
            sStatus = "FAILED" + "***";
        }
        else {
            sStatus = "PASSED";
        }
        await fs.appendFile(sTestSummaryFile, sTestCase.padEnd(35) + "\t" + sStatus + "\n", (err) => {
            if (err)
                console.log(err);
        });
    }
    static async getTimeStamp() {
        return await new Date().toLocaleString().replace(/\//g, "").replace(/,/g, "").replace(/ /g, "_").replace(/:/g, "");
    }
    static async afterTest(TEST_STATUS) {
        await this.appendToTestSummary(Constants_1.Constants.TEST_SUMMARY_FILE, Constants_1.Constants.TESTCASE_NAME, TEST_STATUS);
        await Constants_1.Constants.driver.sleep(1 * 1000);
        if (TEST_STATUS.toUpperCase() == "FAILED" || TEST_STATUS == false) {
            try {
                let sFileName = await this.takeScreenShot(Constants_1.Constants.driver, Constants_1.Constants.TEST_SCREENSHOT_FOLDER);
                await this.logMessage("INFO", "Screenshot - " + sFileName);
            }
            catch (err) {
                await this.logMessage("WARNING", "Screenshot - " + "Unable to capture screnshot");
            }
            await this.logMessage("FAIL", " TEST STATUS :: FAILED*******************");
        }
        else
            await this.logMessage("PASS", " TEST STATUS :: PASSED");
        await Constants_1.Constants.driver.sleep(1 * 1000);
        await Constants_1.Constants.driver.quit();
        await Constants_1.Constants.driver.sleep(3 * 1000);
    }
    static async createFolder(strParentFolder, strFolderNames) {
        let arrFolders = strFolderNames.split(",");
        for (var i = 0; i < arrFolders.length; i++) {
            fs.mkdir(path.join(Constants_1.Constants.PROJECT_FOLDER, strParentFolder, arrFolders[i]), { recursive: true }, function (err) {
                if (err)
                    console.log(" Results directory NOT created." + err);
                else
                    console.log(" Results directory successfully created.");
            });
        }
    }
    static async getDataFromFileAsDictionary(strFileName) {
        let arrData = {};
        let strTemp = fs.readFileSync(strFileName, 'utf-8');
        let lines = strTemp.split("\n");
        for (let line of lines) {
            let arrTemp = line.split("=");
            let strKey = arrTemp[0].trim();
            let strValue = arrTemp[1].trim();
            arrData[strKey] = strValue;
        }
        return arrData;
    }
}
exports.CommonFunctions = CommonFunctions;
CommonFunctions.strBrowserName = "";
