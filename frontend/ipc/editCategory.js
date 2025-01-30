const { ipcMain } = require('electron');
const sessionManager = require('../SessionManager');
const log = require('electron-log');
const licenseManager = require('../LicenseManager');
const db = require('../db/db');
const { transactions } = require('../db/schema/Transactions');
const { statements } = require('../db/schema/Statement');
const { cases } = require('../db/schema/Cases');
const { eq, and } = require("drizzle-orm");
const axios = require("axios");

function registerCategoryHandlers() {

    const formatDate = (dateString) => {
        const date = new Date(dateString); // Parse the date string
        const day = String(date.getDate()).padStart(2, '0'); // Get day and pad with zero
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Get month (0-based) and pad with zero
        const year = date.getFullYear(); // Get full year

        return `${day}-${month}-${year}`; // Format as dd-mm-yyyy
    };

    ipcMain.handle('edit-category', async (event, data) => {

        log.info('Edit Category : ', data);
        const caseId = 26;

        let new_categories = [];

        const transactionsForCase = await db
            .select({
                "id": transactions.id,
                "Date": transactions.date,
                "Description": transactions.description,
                "Type": transactions.type,
                "Amount": transactions.amount,
                "Balance": transactions.balance,
                "Category": transactions.category,
            })
            .from(transactions)
            .innerJoin(statements, eq(transactions.statementId, statements.id))
            .innerJoin(cases, eq(statements.caseId, cases.id))
            .where(eq(cases.id, caseId));

        log.info("Count of transactions for case:", transactionsForCase[1]);


        const frontendData = {
            478: {

                "Value Date": "2023-04-06",
                "Description": "upi-mraiyazanwarqures-qureshi.aiyaz123-3@okaxis-mahb0000470-309653603841-upi",
                "transactionId": 12,
                "Debit": null,
                "Credit": 17000,
                "Balance": 17190,
                "Bank": "a",
                "Category": "Bank Interest Received",
                "Entity": "mraiyazanwarqures",
                "Month": "Apr-2023",
                "Date": 6,
                "oldCategory": "Upi-cr",
                "keyword": ""
            }
        }

        const updatedTransactions = transactionsForCase.map((transaction) => {

            const { id, Date, Amount, Type, ...requiredFields } = transaction;
            const frontendEntry = frontendData[transaction.id]; // Check if the ID exists in frontend data

            if (frontendEntry) {
                log.info("Found frontend entry for ID:", frontendEntry, id);
                const formattedDate = formatDate(Date);
                // If present in frontend data, update the transaction
                return {
                    "Value Date": formattedDate,
                    ...requiredFields,
                    Category: frontendEntry.Category || transaction.Category,
                    Debit: Type === "debit" ? Amount : 0,
                    Credit: Type === "credit" ? Amount : 0
                };
            }

            return {
                "Value Date": formatDate(Date),
                ...requiredFields,
                Debit: Type === "debit" ? Amount : 0,
                Credit: Type === "credit" ? Amount : 0
            };
        });

        log.info("Updated transactions:", updatedTransactions.slice(0, 5));


        const transformedCategories = Object.values(frontendData).map(item => ({
            Description: item.Description || "Unknown",
            "Debit / Credit": item.Debit ? "Debit" : "Credit",
            Category: item.Category || "Uncategorized",
            Particulars: item.Category === "Unknown"
        }));

        console.log(transformedCategories[0], transformedCategories.length);


        try {
            // make api call 
            const serverEndpoint = "http://localhost:7500/edit-category/";

            const payload = {
                transaction_data: updatedTransactions,
                new_categories: transformedCategories
            }

            // use axios 
            const response = await axios.post(serverEndpoint, payload, {
                headers: { "Content-Type": "application/json" },
                timeout: 300000,
                validateStatus: (status) => status === 200,
            });

            log.info("API response:", response.data);
        }
        catch (error) {
            log.error("API call failed:", error);
            log.error("Failed to make api call");
        }



    })
}

module.exports = { registerCategoryHandlers };