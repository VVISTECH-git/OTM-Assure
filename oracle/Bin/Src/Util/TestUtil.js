"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestUtil = void 0;
class TestUtil {
    constructor(driver, URL, TEST_LOG_FOLDER, TESTCASE_NAME, TEST_SUMMARY_FILE) {
        this.isAlreadyLoggedIn = false;
        this.driver = driver;
        this.TEST_LOG_FOLDER = TEST_LOG_FOLDER;
        this.TEST_SUMMARY_FILE = TEST_SUMMARY_FILE;
        this.TEST_SCREENSHOT_FOLDER = require("path").join(TEST_LOG_FOLDER, "..", "Screenshots");
        this.TEST_LOG_FILE = require("path").join(TEST_LOG_FOLDER, TESTCASE_NAME + ".log");
    }
    async loadURL(sURL) {
        this.CURRENT_URL = sURL;
        await this.logMessage("INFO", "URL - " + sURL);
        await CommonFunctions_1.CommonFunctions.loadURL(this.driver, sURL);
        await this.driver.sleep(2 * 1000);
    }
    async logMessage(sLevel, sMessage) {
        let loginPage = await new LoginPage_1.LoginPage(this.driver, this.TEST_LOG_FILE);
        await loginPage.logMessage(sLevel, sMessage);
    }
    async navigateFromHomePageTo(LinksWithDelimiter) {
        let homePage = await new HomePage_1.HomePage(this.driver, this.TEST_LOG_FILE);
        await homePage.navigationTo(LinksWithDelimiter);
    }
    async closePopUp() {
        let AllWindows = await this.driver.getAllWindowHandles();
        await this.driver.close();
        await this.driver.sleep(2 * 1000);
        await this.driver.switchTo().window(AllWindows[AllWindows.length - 2]);
    }
    async login(USERNAME, PASSWORD) {
        try {
            let strTitle = await this.driver.getTitle();
            await this.driver.sleep(1 * 1000);
            let loginPage = await new LoginPage_1.LoginPage(this.driver, this.TEST_LOG_FILE);
            if (strTitle.includes("Sign In To ORACLE CLOUD")) {
                await loginPage.login(USERNAME, PASSWORD, "OPC");
            }
            else if (strTitle.includes("Cloud Sign In")) {
                await loginPage.login(USERNAME, PASSWORD, "OCI");
            }
            else {
                await this.logMessage("FAIL", "Not a login page. Please check URL once");
                return false;
            }
            if (this.CURRENT_URL.includes("analytics")) {
                let homepage = await new OBIEEHomePage_1.OBIEEHomePage(this.driver, this.TEST_LOG_FILE);
                return await homepage.isPageLoaded();
            }
            else if (this.CURRENT_URL.includes("xmlpserver")) {
                let homepage = await new BIPHomePage_1.BIPHomePage(this.driver, this.TEST_LOG_FILE);
                return await homepage.isPageLoaded();
            }
            else {
                let homepage = await new HomePage_1.HomePage(this.driver, this.TEST_LOG_FILE);
                return await homepage.isPageLoaded();
            }
        }
        catch (err) {
            return false;
        }
    }
    async createRLD(sRLDID, sRateOfferingID) {
        await this.navigateFromHomePageTo("Sourcing>Rate Maintenance>Manage Rate Load Definition");
        let rateLoadDefinationsPage = await new RateLoadDefinationsPage_1.RateLoadDefinationsPage(this.driver, this.TEST_LOG_FILE);
        let finderPage = new FinderPage_1.FinderPage(this.driver, this.TEST_LOG_FILE);
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
    async navigateToHomePage() {
        let homepage = await new HomePage_1.HomePage(this.driver, this.TEST_LOG_FILE);
        await homepage.navigateToHomePage();
    }
    async searchAndSelect(OBJECT_ID, SAVEDQUERY, temp = 'Begins With') {
        let finderPage = await new FinderPage_1.FinderPage(this.driver, this.TEST_LOG_FILE);
        let finderResultsPage = await new FinderResultsPage_1.FinderResultsPage(this.driver, this.TEST_LOG_FILE);
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
    async searchAndEdit(OBJECT_ID, SAVEDQUERY, strOperator = 'Begins With') {
        await this.searchAndSelect(OBJECT_ID, SAVEDQUERY, strOperator);
        let finderResultsPage = await new FinderResultsPage_1.FinderResultsPage(this.driver, this.TEST_LOG_FILE);
        await finderResultsPage.navigateToEditPage();
    }
    async searchAndView(OBJECT_ID, SAVEDQUERY, strOperator = 'Begins With') {
        await this.searchAndSelect(OBJECT_ID, SAVEDQUERY, strOperator);
        let finderResultsPage = await new FinderResultsPage_1.FinderResultsPage(this.driver, this.TEST_LOG_FILE);
        await finderResultsPage.navigateToViewPage();
    }
    async searchAndNew(OBJECT_ID, SAVEDQUERY) {
        let finderPage = await new FinderPage_1.FinderPage(this.driver, this.TEST_LOG_FILE);
        await finderPage.navigateToCreatePage();
        await this.driver.sleep(4 * 1000);
    }
    async createDomain(DOMAIN_NAME, PASSWORD, ClickReturn) {
        let status = false;
        let addDomianPage = await new AddDomianPage_1.AddDomainPage(this.driver, this.TEST_LOG_FILE);
        let createNewDomainResultsPage = await new CreateNewDomainResultsPage_1.CreateNewDomainResultsPage(this.driver, this.TEST_LOG_FILE);
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
    async createUser(DOMAIN_NAME, USERNAME, NICKNAME, PASSWORD, ClickOnCreateAnother) {
        let userCeationPage = await new UserCeationPage_1.UserCeationPage(this.driver, this.TEST_LOG_FILE);
        let userCreationResultsPage = await new UserCreationResultsPage_1.UserCreationResultsPage(this.driver, this.TEST_LOG_FILE);
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
    async dbXmlImport(FILE_NAME, TIME_TO_WAIT_AFTER_UPLOAD) {
        await this.navigateFromHomePageTo("Business Process Automation>Data Import/Export>DB.XML Import");
        let importDBXmlPage = await new ImportDBXmlPage_1.ImportDBXmlPage(this.driver, this.TEST_LOG_FILE);
        await importDBXmlPage.navigateToDBXMLImportResultsPage(FILE_NAME, "IU");
        await this.driver.sleep(TIME_TO_WAIT_AFTER_UPLOAD * 1000);
        return await true;
    }
    async uploadFile(FILE_NAME, TIME_TO_WAIT_AFTER_UPLOAD) {
        await this.navigateFromHomePageTo("Business Process Automation>Integration>Integration Manager");
        let launchIntegrationPage = await new LaunchIntegrationPage_1.LaunchIntegrationPage(this.driver, this.TEST_LOG_FILE);
        let uploadAnXMLOrCSVTransmissionPage = await launchIntegrationPage.navigateUploadAnCSVOrXMLTransmissionPage();
        await uploadAnXMLOrCSVTransmissionPage.uploadFile(FILE_NAME, TIME_TO_WAIT_AFTER_UPLOAD);
        return await true;
    }
    async addProperty(sSeqno, sKey, sValue, sDescription, ClickFinish) {
        let propertySetPage = await new EditPropertySetPage_1.PropertySetPage(this.driver, this.TEST_LOG_FILE);
        await propertySetPage.addProperty("Adding Properties", sSeqno, "Set", sKey, sValue, sDescription, ClickFinish);
        return true;
    }
    async runAction(sActionLinks) {
        let finderResultsPage = await new FinderResultsPage_1.FinderResultsPage(this.driver, this.TEST_LOG_FILE);
        await finderResultsPage.runAction(sActionLinks);
    }
    async OperationalPlanning_CreateBuyShipment_Direct() {
        let planningCriteriaPopup = await new PlanningCriteriaPopup_1.PlanningCriteriaPopup(this.driver, this.TEST_LOG_FILE);
        let createDirectShipmentEquipmentPromptPopup = await planningCriteriaPopup.clickOK();
        let buildShipmentPopup = await createDirectShipmentEquipmentPromptPopup.clickOK();
        return await buildShipmentPopup;
    }
    async ShipmentManagement_Tender_SecureResources() {
        let securedResourcesPopup = new SecuredResourcesPopup_1.SecuredResourcesPopup(this.driver, this.TEST_LOG_FILE);
        await securedResourcesPopup.isPageLoaded();
        return await securedResourcesPopup;
    }
    async ShipmentManagement_Tender_AcceptTender() {
        let onlineBookingAndTenderingPopup = new OnlineBookingAndTenderingPopup_1.OnlineBookingAndTenderingPopup(this.driver, this.TEST_LOG_FILE);
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
    async OperationalPlanning_CreateShipment_Multistop() {
        let planningCriteriaPopup = await new PlanningCriteriaPopup_1.PlanningCriteriaPopup(this.driver, this.TEST_LOG_FILE);
        await planningCriteriaPopup.clickOK();
        let buildShipmentPopup = await new BuildShipmentPopup_1.BuildShipmentPopup(this.driver, this.TEST_LOG_FILE);
        return await buildShipmentPopup;
    }
    async BusinessProcessAutomation_Documents_UploadDocument(sFile) {
        let uploadDocumentPopup = await new UploadDocumentPopup_1.UploadDocumentPopup(this.driver, this.TEST_LOG_FILE);
        let uploadDocumentSuccessfulPopup = await uploadDocumentPopup.upload(sFile);
        let documentViewPopup = await uploadDocumentSuccessfulPopup.clickViewDocument();
        let documentMessagePopup = await documentViewPopup.clickOpen();
        return await documentMessagePopup.getContext();
    }
    async findDistanceTimeWithSavedQuery(SAVEDQUERY) {
        let askOracleAboutDistanceAndTimePage = await new AskOracleAboutDistanceAndTimePage_1.AskOracleAboutDistanceAndTimePage(this.driver, this.TEST_LOG_FILE);
        await askOracleAboutDistanceAndTimePage.setSavedQuery(SAVEDQUERY);
        let askOracleAboutDistanceAndTimeResultsPage = await askOracleAboutDistanceAndTimePage.clickFindDistanceAndTime();
        return await askOracleAboutDistanceAndTimeResultsPage;
    }
    async findRates(SAVEDQUERY) {
        let askOracleAboutRatesPage = await new AskOracleAboutRatesPage_1.AskOracleAboutRatesPage(this.driver, this.TEST_LOG_FILE);
        await askOracleAboutRatesPage.setSavedQuery(SAVEDQUERY);
        let AskOracleAboutRatesResultsPage = await askOracleAboutRatesPage.clickSearch();
        return await AskOracleAboutRatesResultsPage;
    }
    async waitUntilPopUpIsDisplayedAndSwitchToIt(intSeconds, intExpectedPopUpCount) {
        let allWindows = await this.driver.getAllWindowHandles();
        let intLength = await allWindows.length;
        if (intLength == intExpectedPopUpCount) {
            await this.driver.switchTo().window(allWindows[allWindows.length - 1]);
        }
        else {
            await this.driver.sleep(intSeconds * 1000);
            await this.waitUntilPopUpIsDisplayedAndSwitchToIt(intSeconds, intExpectedPopUpCount);
        }
    }
    async compareTwoValues(actualValue, expectedValue, message) {
        let isSuccess = false;
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
exports.TestUtil = TestUtil;
const CommonFunctions_1 = require("./CommonFunctions");
const HomePage_1 = require("../Pages/HomePage");
const LoginPage_1 = require("../Pages/LoginPage");
const FinderPage_1 = require("../Pages/FinderPage");
const FinderResultsPage_1 = require("../Pages/FinderResultsPage");
const EditPropertySetPage_1 = require("../Pages/EditPropertySetPage");
const AddDomianPage_1 = require("../Pages/AddDomianPage");
const CreateNewDomainResultsPage_1 = require("../Pages/CreateNewDomainResultsPage");
const UserCeationPage_1 = require("../Pages/UserCeationPage");
const UserCreationResultsPage_1 = require("../Pages/UserCreationResultsPage");
const LaunchIntegrationPage_1 = require("../Pages/LaunchIntegrationPage");
const PlanningCriteriaPopup_1 = require("../Pages/PlanningCriteriaPopup");
const SecuredResourcesPopup_1 = require("../Pages/SecuredResourcesPopup");
const OnlineBookingAndTenderingPopup_1 = require("../Pages/OnlineBookingAndTenderingPopup");
const AskOracleAboutDistanceAndTimePage_1 = require("../Pages/AskOracleAboutDistanceAndTimePage");
const BuildShipmentPopup_1 = require("../Pages/BuildShipmentPopup");
const AskOracleAboutRatesPage_1 = require("../Pages/AskOracleAboutRatesPage");
const UploadDocumentPopup_1 = require("../Pages/UploadDocumentPopup");
const ImportDBXmlPage_1 = require("../Pages/ImportDBXmlPage");
const RateLoadDefinationsPage_1 = require("../Pages/RateLoadDefinationsPage");
const BIPHomePage_1 = require("../Pages/BIPHomePage");
const OBIEEHomePage_1 = require("../Pages/OBIEEHomePage");
