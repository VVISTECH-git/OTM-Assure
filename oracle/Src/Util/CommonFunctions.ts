import * as fs from 'fs';
import * as readline from 'readline';
import { WebDriver, logging } from "selenium-webdriver";
import { Browser } from './Browser';
import { Constants } from './Constants';
const path = require('path');

export class CommonFunctions {

    public static strBrowserName: string = "";

    public static async getDriver(strBrowser: string): Promise<WebDriver> {
        let driver: WebDriver;
        this.strBrowserName = strBrowser;
        driver = await Browser.getDriver(strBrowser);
        return driver;
    }

    public static async loadURL(driver: WebDriver, strURL: string) {
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
        } while (true)
		await driver.sleep(1*1000);	
    }

    public static async takeScreenShot(driver: WebDriver, strScreenShotFolder: string): Promise<string> {
        let strTimeStamp = await CommonFunctions.getTimeStamp();
        let strFileName = await require('path').join(strScreenShotFolder, strTimeStamp + ".png");        

        await driver.takeScreenshot().then(async function (data) {
            let base64Data: string = data.replace(/^data:image\/png;base64,/, "");
            fs.writeFile(strFileName, base64Data, 'base64', function (error: any) {
                if (error) console.log(error);
            });
        });

        if (await this.strBrowserName.toUpperCase().includes("CHROME")) {
            let logs = await Constants.driver.manage().logs().get(logging.Type.BROWSER);
            for (var i = 0; i < logs.length; i++) {
                let jsonLog = logs[i].toJSON();
                console.log(JSON.stringify(jsonLog));
            }
        }

        var addContext = require('mochawesome/addContext');
        addContext(Constants.TEST_OBJECT, { title: 'Screenshot', value: strFileName });

        return await strFileName;
    }

    public static async readDataFromFile(strFileName: string, strKey: string): Promise<string> {
        return new Promise(function (resolve, reject) {
            let rl = readline.createInterface({
                input: fs.createReadStream(strFileName)
            });

            let isFound: boolean = false;
            rl.on('line', function (line) {
                let keyValuePair: string[] = line.split("=");
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

    public static async logMessage(sLogLevel: any, sMessage: string) {
        let date = new Date();
        switch (sLogLevel) {
            case "INFO": sMessage = "[INFO " + date.toLocaleString() + "] " + sMessage; break;
            case "PASS": sMessage = "[PASS " + date.toLocaleString() + "] " + sMessage; break;
            case "FAIL": sMessage = "[FAIL " + date.toLocaleString() + "] " + sMessage; break;
            case "WARNING": sMessage = "[WARNING " + date.toLocaleString() + "] " + sMessage; break;
        }
        await console.log(sMessage);
        await fs.appendFile(Constants.TEST_LOG_FILE, sMessage + "\n", (err: any) => {
            if (err) console.log(err);
        });
        var addContext = require('mochawesome/addContext');
        addContext(Constants.TEST_OBJECT, sMessage);
    }

    public static async appendToTestSummary(sTestSummaryFile: string = "", sTestCase: string = "", sStatus: any) {
        if ((sStatus.toUpperCase() == "FAILED") || (sStatus == false)) { sStatus = "FAILED" + "***"; }
        else { sStatus = "PASSED"; }
        await fs.appendFile(sTestSummaryFile, sTestCase.padEnd(35) + "\t" + sStatus + "\n", (err: any) => {
            if (err) console.log(err);
        });
    }

    public static async getTimeStamp(): Promise<string> {
        return await new Date().toLocaleString().replace(/\//g, "").replace(/,/g, "").replace(/ /g, "_").replace(/:/g, "");
    }

	public static async afterTest(TEST_STATUS: any) {
        await this.appendToTestSummary(Constants.TEST_SUMMARY_FILE, Constants.TESTCASE_NAME, TEST_STATUS);
        await Constants.driver.sleep(1 * 1000);
        if (TEST_STATUS.toUpperCase() == "FAILED" || TEST_STATUS == false) {
            try {
                let sFileName = await this.takeScreenShot(Constants.driver, Constants.TEST_SCREENSHOT_FOLDER);
                await this.logMessage("INFO", "Screenshot - " + sFileName);
            } catch (err) {                 
                await this.logMessage("WARNING", "Screenshot - " + "Unable to capture screnshot");
             }
            await this.logMessage("FAIL", " TEST STATUS :: FAILED*******************");
        }
        else
            await this.logMessage("PASS", " TEST STATUS :: PASSED");

        await Constants.driver.sleep(1 * 1000);
        await Constants.driver.quit();
        await Constants.driver.sleep(3 * 1000);
    }


    public static async createFolder(strParentFolder: string, strFolderNames: string) {

        let arrFolders: string[] = strFolderNames.split(",");

        for (var i = 0; i < arrFolders.length; i++) {
            fs.mkdir(path.join(Constants.PROJECT_FOLDER, strParentFolder, arrFolders[i]), { recursive: true }, function (err: any) {
                if (err) console.log(" Results directory NOT created." + err);
                else console.log(" Results directory successfully created.");
            })
        }

    }

    public static async getDataFromFileAsDictionary(strFileName:string): Promise<{[key:string]:string}>{
        let arrData: { [key: string]: string } = {};
        let strTemp:string = fs.readFileSync(strFileName, 'utf-8');
        let lines:Array<string> = strTemp.split("\n");       
        
        for(let line of lines){
            let arrTemp:Array<string> = line.split("=");
            let strKey:string = arrTemp[0].trim();
            let strValue:string = arrTemp[1].trim();
            arrData[strKey] = strValue;
        }        
        return arrData;
    }	

}
