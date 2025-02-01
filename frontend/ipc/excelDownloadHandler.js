const { ipcMain } = require('electron');
const log = require('electron-log');
const db = require('../db/db');
const { transactions } = require('../db/schema/Transactions');
const { statements } = require('../db/schema/Statement');
const { cases } = require('../db/schema/Cases');
const { summary } = require('../db/schema/Summary');
const { eod } = require('../db/schema/Eod');
const { eq, and, SQL, sql, inArray, Name } = require("drizzle-orm");
const axios = require("axios");


function registerExcelDownloadHandlers(event, data) {

    ipcMain.handle('excel-report-download', async (event, caseId) => {

        let new_categories = [];
        let transactionsForCase = [];
        let formattedTransactions = [];
        let statementsForCase = [];
        let caseName = "";

        try {

            // get the case name
            try {
                caseName = await db
                    .select({
                        "name": cases.name,
                    })
                    .from(cases)
                    .where(eq(cases.id, caseId));

                caseName = caseName[0].name;
            }
            catch (err) {
                log.error("Error fetching case name:", err);
                throw err;
            }


            try {
                // get all statements for the case
                statementsForCase = await db
                    .select({
                        "accountNumber": statements.accountNumber,
                        "customerName": statements.customerName,
                    })
                    .from(statements)
                    .where(eq(statements.caseId, caseId));

            }
            catch (err) {
                log.error("Error fetching statements for case:", err);
                throw err;
            }



            try {
                transactionsForCase = await db
                    .select({
                        "Date": transactions.date,
                        "Description": transactions.description,
                        "Type": transactions.type,
                        "Amount": transactions.amount,
                        "Balance": transactions.balance,
                        "Category": transactions.category,
                        "Entity": transactions.entity,
                        "Bank": transactions.bank
                    })
                    .from(transactions)
                    .innerJoin(statements, eq(transactions.statementId, statements.id))
                    .innerJoin(cases, eq(statements.caseId, cases.id))
                    .where(eq(cases.id, caseId));
            }
            catch (err) {
                log.error("Error fetching transactions for case:", err);
                throw err;
            }

            if (transactionsForCase.length > 0) {

                formattedTransactions = transactionsForCase.map(txn => {

                    const { Amount, Type, ...remainingFields } = txn;

                    return {
                        ...remainingFields,
                        "Debit": Type === "debit" ? Amount : 0,
                        "Credit": Type === "credit" ? Amount : 0,
                    };
                });
            }

            log.info("Formatted Transactions : ", formattedTransactions.slice(0, 2));
            // Account Number
            // Account Name
            // Bank

            const nameAndNumberData = statementsForCase.map(statement => ({
                "Account Number": statement.accountNumber,
                "Account Name": statement.customerName,
                "Bank": statement.bank
            }));


            try {
                
                const serverEndpoint = "http://localhost:7500/excel-download/";

                const payload = {
                    transaction_data: formattedTransactions,
                    name_and_number_data: nameAndNumberData,
                    case_name: caseName,
                }

                // 

                // use axios 
                const response = await axios.post(serverEndpoint, payload, {
                    headers: { "Content-Type": "application/json" },
                    timeout: 300000,
                    validateStatus: (status) => status === 200,
                });

            }
            catch (err) {
                log.error("Error fetching transactions for case:", err);
                throw err;
            }

        }
        catch (err) {
            log.error("Error fetching transactions for case:", err);
        }

    });
}


module.exports = { registerExcelDownloadHandlers };