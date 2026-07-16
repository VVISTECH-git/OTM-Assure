export class TestUtil {
    public driver: WebDriver;
    public CURRENT_URL: string;
    public TEST_LOG_FOLDER: any;
    public TEST_SUMMARY_FILE: string;
    public TEST_LOG_FILE: string;
    public TEST_SCREENSHOT_FOLDER: string;
    public isAlreadyLoggedIn: boolean;

    public constructor(driver: WebDriver, URL: string, TEST_LOG_FOLDER: any, TESTCASE_NAME: string, TEST_SUMMARY_FILE: any) {
        this.isAlreadyLoggedIn = false;
        this.driver = driver;
        this.TEST_LOG_FOLDER = TEST_LOG_FOLDER;
        this.TEST_SUMMARY_FILE = TEST_SUMMARY_FILE;
        this.TEST_SCREENSHOT_FOLDER = require("path").join(TEST_LOG_FOLDER, "..", "Screenshots");
        this.TEST_LOG_FILE = require("path").join(TEST_LOG_FOLDER, TESTCASE_NAME + ".log");
    }

    public async loadURL(sURL: string) {
        this.CURRENT_URL = sURL;
        await this.logMessage("INFO", "URL - " + sURL);
        await CommonFunctions.loadURL(this.driver, sURL);
        await this.driver.sleep(2 * 1000);
    }

    public async logMessage(sLevel: string, sMessage: string) {

        let loginPage = await new LoginPage(this.driver, this.TEST_LOG_FILE);
        await loginPage.logMessage(sLevel, sMessage);
    }

    public async navigateFromHomePageTo(LinksWithDelimiter: string) {

        let homePage = await new HomePage(this.driver, this.TEST_LOG_FILE);
        await homePage.navigationTo(LinksWithDelimiter);
    }

    public async closePopUp() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.close();
        await this.driver.sleep(2 * 1000);
        await this.driver.switchTo().window(AllWindows[AllWindows.length - 2]);
    }

    public async login(USERNAME: string, PASSWORD: string) {
        try {
            let strTitle = await this.driver.getTitle();
            await this.driver.sleep(1 * 1000);
            let loginPage = await new LoginPage(this.driver, this.TEST_LOG_FILE);
            if (strTitle.includes("Sign In To ORACLE CLOUD")) {
                await loginPage.login(USERNAME, PASSWORD, "OPC");
            } else if (strTitle.includes("Cloud Sign In")) {
                await loginPage.login(USERNAME, PASSWORD, "OCI");
            }
            else {
                await this.logMessage("FAIL", "Not a login page. Please check URL once");
                return false;
            }

            if (this.CURRENT_URL.includes("analytics")) {
                let homepage = await new OBIEEHomePage(this.driver, this.TEST_LOG_FILE);
                return await homepage.isPageLoaded();
            }
            else if (this.CURRENT_URL.includes("xmlpserver")) {
                let homepage = await new BIPHomePage(this.driver, this.TEST_LOG_FILE);
                return await homepage.isPageLoaded();
            }
            else {
                let homepage = await new HomePage(this.driver, this.TEST_LOG_FILE);
                return await homepage.isPageLoaded();
            }
        } catch (err) { return false; }
    }

    public async createRLD(sRLDID: string,  sRateOfferingID: string) {
        await this.navigateFromHomePageTo("Sourcing>Rate Maintenance>Manage Rate Load Definition");
        let rateLoadDefinationsPage = await new RateLoadDefinationsPage(this.driver, this.TEST_LOG_FILE);
        let finderPage = new FinderPage(this.driver, this.TEST_LOG_FILE);
        await finderPage.clickNew();
        await rateLoadDefinationsPage.createNewRLD(sRLDID, sRateOfferingID);
        let isTestRes = await rateLoadDefinationsPage.validateRLD();
        if (isTestRes) {
            await rateLoadDefinationsPage.clickSaveAndClose();
            return true;
        }
        else
            return false;
    }

    public async navigateToHomePage() {
        let homepage = await new HomePage(this.driver, this.TEST_LOG_FILE);
        await homepage.navigateToHomePage();

    }

    public async searchAndSelect(OBJECT_ID: string, SAVEDQUERY: string, temp: string = 'Begins With') {

        let finderPage = await new FinderPage(this.driver, this.TEST_LOG_FILE);
        let finderResultsPage = await new FinderResultsPage(this.driver, this.TEST_LOG_FILE);

        if (OBJECT_ID !== "" && SAVEDQUERY == "") {
            await finderPage.navigateToFinderSetResultsPageWithXID(OBJECT_ID, temp);
            await finderResultsPage.checkSelectAll();
            return await 1;
        }
        else if (OBJECT_ID == "" && SAVEDQUERY !== "") {
            await finderPage.navigateToFinderSetResultsPageWithSavedQuery(SAVEDQUERY);
            await finderResultsPage.checkSelectAll();
            return await 1;

        }
        else if (OBJECT_ID !== "" && SAVEDQUERY !== "") {
            console.log("Either ID or saved query needs to be mentioned not both !!");

        }
        else if (OBJECT_ID == "" && SAVEDQUERY == "") {
            await finderPage.navigateToFinderSetResultsPage();
            await finderResultsPage.checkSelectAll();
            return await 1;
        }

    }

    public async searchAndEdit(OBJECT_ID: string, SAVEDQUERY: string, strOperator: string = 'Begins With') {
        await this.searchAndSelect(OBJECT_ID, SAVEDQUERY, strOperator);
        let finderResultsPage = await new FinderResultsPage(this.driver, this.TEST_LOG_FILE);
        await finderResultsPage.navigateToEditPage();
    }

    public async searchAndView(OBJECT_ID: string, SAVEDQUERY: string, strOperator: string = 'Begins With') {
        await this.searchAndSelect(OBJECT_ID, SAVEDQUERY, strOperator);
        let finderResultsPage = await new FinderResultsPage(this.driver, this.TEST_LOG_FILE);
        await finderResultsPage.navigateToViewPage();
    }

    public async searchAndNew(OBJECT_ID: string, SAVEDQUERY: string) {
        let finderPage = await new FinderPage(this.driver, this.TEST_LOG_FILE);
        await finderPage.navigateToCreatePage();
        await this.driver.sleep(4 * 1000);
    }

    public async createDomain(DOMAIN_NAME: any, PASSWORD: any, ClickReturn: boolean) {
        let status = false;
        let addDomianPage = await new AddDomainPage(this.driver, this.TEST_LOG_FILE);
        let createNewDomainResultsPage = await new CreateNewDomainResultsPage(this.driver, this.TEST_LOG_FILE);
        await addDomianPage.createDomian(DOMAIN_NAME, PASSWORD);
        let sSuccessMessage = await createNewDomainResultsPage.getConfirmationMessage();
        if (await sSuccessMessage.includes("successfully")) {
            await createNewDomainResultsPage.logMessage("PASS", "Domain Creating is successful - " + sSuccessMessage);
            status = true;
        }
        else {
            await createNewDomainResultsPage.logMessage("FAIL", "Domain Creating is not successful - " + sSuccessMessage);
            status = false;
        }
        if (ClickReturn)
            await createNewDomainResultsPage.clickReturn();
        return await status;
    }

    public async createUser(DOMAIN_NAME: string, USERNAME: string, NICKNAME: string, PASSWORD: string, ClickOnCreateAnother: boolean) {
        let userCeationPage = await new UserCeationPage(this.driver, this.TEST_LOG_FILE);
        let userCreationResultsPage = await new UserCreationResultsPage(this.driver, this.TEST_LOG_FILE);
        await userCeationPage.createUser(DOMAIN_NAME, USERNAME, PASSWORD, NICKNAME);
        let sSuccessMessage = await userCreationResultsPage.getConfirmationMessage();
        let status;
        if (sSuccessMessage.indexOf("successfully") !== -1) {
            await userCreationResultsPage.logMessage("PASS", "User Creation is Successful - " + sSuccessMessage);
            status = true;
        }
        else {
            await userCreationResultsPage.logMessage("PASS", "User Creation is not Successful - " + sSuccessMessage);
            status = false;
        }

        if (ClickOnCreateAnother)
            await userCreationResultsPage.clickCreateAnother();

        return await status;
    }

    public async dbXmlImport(FILE_NAME: string, TIME_TO_WAIT_AFTER_UPLOAD: number) {
        await this.navigateFromHomePageTo("Business Process Automation>Data Import/Export>DB.XML Import");
        let importDBXmlPage = await new ImportDBXmlPage(this.driver, this.TEST_LOG_FILE);
        await importDBXmlPage.navigateToDBXMLImportResultsPage(FILE_NAME, "IU");
        await this.driver.sleep(TIME_TO_WAIT_AFTER_UPLOAD * 1000);
        return await true;
    }

    public async uploadFile(FILE_NAME: string, TIME_TO_WAIT_AFTER_UPLOAD: number) {
        await this.navigateFromHomePageTo("Business Process Automation>Integration>Integration Manager");
        let launchIntegrationPage = await new LaunchIntegrationPage(this.driver, this.TEST_LOG_FILE);
        let uploadAnXMLOrCSVTransmissionPage = await launchIntegrationPage.navigateUploadAnCSVOrXMLTransmissionPage();
        await uploadAnXMLOrCSVTransmissionPage.uploadFile(FILE_NAME, TIME_TO_WAIT_AFTER_UPLOAD);
        return await true;
    }

    public async addProperty(sSeqno: string, sKey: string, sValue: string, sDescription: string, ClickFinish: boolean) {
        let propertySetPage = await new PropertySetPage(this.driver, this.TEST_LOG_FILE);
        await propertySetPage.addProperty("Adding Properties", sSeqno, "Set", sKey, sValue, sDescription, ClickFinish);
        return true;
    }

    public async runAction(sActionLinks: string) {
        let finderResultsPage = await new FinderResultsPage(this.driver, this.TEST_LOG_FILE);
        await finderResultsPage.runAction(sActionLinks);
    }

    public async OperationalPlanning_CreateBuyShipment_Direct() {
        let planningCriteriaPopup = await new PlanningCriteriaPopup(this.driver, this.TEST_LOG_FILE);
        let createDirectShipmentEquipmentPromptPopup = await planningCriteriaPopup.clickOK();
        let buildShipmentPopup = await createDirectShipmentEquipmentPromptPopup.clickOK();
        return await buildShipmentPopup;
    }

    public async ShipmentManagement_Tender_SecureResources() {
        let securedResourcesPopup = new SecuredResourcesPopup(this.driver, this.TEST_LOG_FILE);
        await securedResourcesPopup.isPageLoaded();
        return await securedResourcesPopup;
    }

    public async ShipmentManagement_Tender_AcceptTender() {
        let onlineBookingAndTenderingPopup = new OnlineBookingAndTenderingPopup(this.driver, this.TEST_LOG_FILE);
        let resultsPopup = await onlineBookingAndTenderingPopup.clickFinished();
        let sSuccessMessage = await resultsPopup.getConfirmationMessage();
        if (await sSuccessMessage.includes("successfully")) {
            await resultsPopup.logMessage("PASS", "Message Validation - " + sSuccessMessage);
            return await true;
        }
        else {
            await resultsPopup.logMessage("FAIL", "Message Validation is not successful - " + sSuccessMessage);
            return await false;
        }
    }

    public async OperationalPlanning_CreateShipment_Multistop() {
        let planningCriteriaPopup = await new PlanningCriteriaPopup(this.driver, this.TEST_LOG_FILE);
        await planningCriteriaPopup.clickOK();
        let buildShipmentPopup = await new BuildShipmentPopup(this.driver, this.TEST_LOG_FILE);
        return await buildShipmentPopup;
    }


    public async BusinessProcessAutomation_Documents_UploadDocument(sFile: string) {
        let uploadDocumentPopup = await new UploadDocumentPopup(this.driver, this.TEST_LOG_FILE);
        let uploadDocumentSuccessfulPopup = await uploadDocumentPopup.upload(sFile);
        let documentViewPopup = await uploadDocumentSuccessfulPopup.clickViewDocument();
        let documentMessagePopup = await documentViewPopup.clickOpen();
        return await documentMessagePopup.getContext();
    }

    public async findDistanceTimeWithSavedQuery(SAVEDQUERY: string) {
        let askOracleAboutDistanceAndTimePage = await new AskOracleAboutDistanceAndTimePage(this.driver, this.TEST_LOG_FILE);
        await askOracleAboutDistanceAndTimePage.setSavedQuery(SAVEDQUERY);
        let askOracleAboutDistanceAndTimeResultsPage = await askOracleAboutDistanceAndTimePage.clickFindDistanceAndTime();
        return await askOracleAboutDistanceAndTimeResultsPage;
    }

    public async findRates(SAVEDQUERY: string) {
        let askOracleAboutRatesPage = await new AskOracleAboutRatesPage(this.driver, this.TEST_LOG_FILE);
        await askOracleAboutRatesPage.setSavedQuery(SAVEDQUERY);
        let AskOracleAboutRatesResultsPage = await askOracleAboutRatesPage.clickSearch();
        return await AskOracleAboutRatesResultsPage;
    }

    public async waitUntilPopUpIsDisplayedAndSwitchToIt(intSeconds: number, intExpectedPopUpCount: number) {
        let allWindows = await this.driver.getAllWindowHandles();
        let intLength = await allWindows.length;
        if (intLength == intExpectedPopUpCount) {
            await this.driver.switchTo().window(allWindows[allWindows.length - 1]);
        } else {
            await this.driver.sleep(intSeconds * 1000);
            await this.waitUntilPopUpIsDisplayedAndSwitchToIt(intSeconds, intExpectedPopUpCount);
        }
    }

    public async compareTwoValues(actualValue: any, expectedValue: any, message: string) {
        let isSuccess: boolean = false;
        if (actualValue == expectedValue) {
            await this.logMessage("INFO", message + " Success!!! Expected and Actual Values are: " + actualValue);
            isSuccess = await true;
        }
        else {
            await this.logMessage("FAIL", message + " Failed, Expected: " + expectedValue + " not equals to Actual: " + actualValue);
        }
        return await isSuccess;
    }

}


import { WebDriver } from "selenium-webdriver";
import { CommonFunctions } from "./CommonFunctions";
import { HomePage } from "../Pages/HomePage";
import { LoginPage } from "../Pages/LoginPage";
import { FinderPage } from "../Pages/FinderPage";
import { FinderResultsPage } from "../Pages/FinderResultsPage";
import { PropertySetPage } from "../Pages/EditPropertySetPage";
import { AddDomainPage } from "../Pages/AddDomianPage";
import { CreateNewDomainResultsPage } from "../Pages/CreateNewDomainResultsPage";
import { UserCeationPage } from "../Pages/UserCeationPage";
import { UserCreationResultsPage } from "../Pages/UserCreationResultsPage";
import { LaunchIntegrationPage } from "../Pages/LaunchIntegrationPage";
import { PlanningCriteriaPopup } from "../Pages/PlanningCriteriaPopup";
import { SecuredResourcesPopup } from "../Pages/SecuredResourcesPopup";
import { OnlineBookingAndTenderingPopup } from "../Pages/OnlineBookingAndTenderingPopup";
import { AskOracleAboutDistanceAndTimePage } from "../Pages/AskOracleAboutDistanceAndTimePage";
import { BuildShipmentPopup } from "../Pages/BuildShipmentPopup";
import { AskOracleAboutRatesPage } from "../Pages/AskOracleAboutRatesPage";
import { UploadDocumentPopup } from "../Pages/UploadDocumentPopup";
import { ImportDBXmlPage } from "../Pages/ImportDBXmlPage";
import { RateLoadDefinationsPage } from "../Pages/RateLoadDefinationsPage";
import { BIPHomePage } from "../Pages/BIPHomePage";
import { OBIEEHomePage } from "../Pages/OBIEEHomePage";
