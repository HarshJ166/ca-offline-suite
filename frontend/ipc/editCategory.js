const { ipcMain } = require('electron');
const sessionManager = require('../SessionManager');
const log = require('electron-log');
const licenseManager = require('../LicenseManager');
const db = require('../db/db');
const { transactions } = require('../db/schema/Transactions');

function registerCategoryHandlers() {

    ipcMain.handle('edit-category', async (event, data) => {

        log.info('Edit Category : ', data);
        const caseId = data.caseId;

        let new_categories = [];
   
        const transactionsForCase = await db
        .select()
        .from(transactions)
        .innerJoin(statements, eq(transactions.statementId, statements.id)) // Join statements with transactions
        .innerJoin(cases, eq(statements.caseId, cases.id)) // Join cases with statements
        .where(eq(cases.id, caseId)); // Filter by the specific case ID
      
        log.info(transactionsForCase);

     

        [
            // {
            //     "Value Date": "2023-04-06",
            //     "Description": "upi-mraiyazanwarqures-qureshi.aiyaz123-3@okaxis-mahb0000470-309653603841-upi",
            //     "transactionId": 12,
            //     "Debit": null,
            //     "Credit": 17000,
            //     "Balance": 17190,
            //     "Bank": "a",
            //     "Category": "Bank Interest Received",
            //     "Entity": "mraiyazanwarqures",
            //     "Month": "Apr-2023",
            //     "Date": 6,
            //     "oldCategory": "Upi-cr",
            //     "keyword": ""
            // },
        ]


    })
}

module.exports = { registerCategoryHandlers };