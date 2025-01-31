const { ipcMain } = require('electron');
const sessionManager = require('../SessionManager');
const log = require('electron-log');
const licenseManager = require('../LicenseManager');
const db = require('../db/db');
const { transactions } = require('../db/schema/Transactions');
const { statements } = require('../db/schema/Statement');
const { cases } = require('../db/schema/Cases');
const { summary } = require('../db/schema/Summary');
const { eod } = require('../db/schema/Eod');
const { opportunityToEarn } = require('../db/schema/OpportunityToEarn');
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


    async function processOpportunityToEarnData(opportunityToEarnData, caseId) {
        try {
            console.log(
                "Full Opportunity to Earn Data:",
                JSON.stringify(opportunityToEarnData)
            );

            // Check if the data is an array with at least one element
            const opportunityToEarnArray = Array.isArray(opportunityToEarnData)
                ? opportunityToEarnData
                : opportunityToEarnData["Opportunity to Earn"];

            if (!opportunityToEarnArray || opportunityToEarnArray.length === 0) {
                log.warn("No Opportunity to Earn data found");
                return false;
            }

            const opportunityToEarnValues = Array.isArray(opportunityToEarnArray)
                ? opportunityToEarnArray[0]
                : opportunityToEarnArray;

            const validCaseId = caseId

            // Extract values with default fallbacks of 0
            const homeLoanValue =
                opportunityToEarnValues?.["Maximum Home Loan Value"] || 0;
            const loanAgainstProperty =
                opportunityToEarnValues?.["Maximum LAP Value"] || 0;
            const businessLoan = opportunityToEarnValues?.["Maximum BL Value"] || 0;
            const termPlan = opportunityToEarnValues?.["Maximum TP Value"] || 0;
            const generalInsurance = opportunityToEarnValues?.["Maximum GI Value"] || 0;

            const existingOpportunityToEarn = await db
                .select()
                .from(opportunityToEarn)
                .where(eq(opportunityToEarn.caseId, validCaseId));

            if (existingOpportunityToEarn.length > 0) {
                // Update the existing opportunity to earn record
                await db
                    .update(opportunityToEarn)
                    .set({
                        homeLoanValue,
                        loanAgainstProperty,
                        businessLoan,
                        termPlan,
                        generalInsurance,
                    })
                    .where(eq(opportunityToEarn.caseId, validCaseId));
            } else {
                // Insert new opportunity to earn record
                await db.insert(opportunityToEarn).values({
                    caseId: validCaseId,
                    homeLoanValue,
                    loanAgainstProperty,
                    businessLoan,
                    termPlan,
                    generalInsurance,
                    createdAt: new Date(),
                });
            }

            log.info(`Opportunity to earn data processed for case ${validCaseId}`);
            return true;
        } catch (error) {
            log.error("Error processing opportunity to earn data:", error);
            throw error;
        }
    }

    const processSummaryData = async (parsedData, caseId) => {
        try {
            const validCaseId = caseId

            // Validate the summary data
            if (
                !parsedData ||
                typeof parsedData !== "object" ||
                !parsedData["Particulars"] ||
                !parsedData["Income Receipts"] ||
                !parsedData["Important Expenses"] ||
                !parsedData["Other Expenses"]
            ) {
                throw new Error("Invalid summary data provided");
            }

            // Prepare summary data object
            const summaryData = {
                particulars: parsedData["Particulars"],
                incomeReceipts: parsedData["Income Receipts"],
                importantExpenses: parsedData["Important Expenses"],
                otherExpenses: parsedData["Other Expenses"],
            };

            // Check if summary data already exists for this case
            const existingSummary = await db
                .select()
                .from(summary)
                .where(eq(summary.caseId, validCaseId))
                .limit(1);

            if (existingSummary.length > 0) {
                // Update the existing summary record
                await db
                    .update(summary)
                    .set({
                        data: JSON.stringify(summaryData),
                        updatedAt: new Date(),
                    })
                    .where(eq(summary.caseId, validCaseId));
                // log.info(`Updated Data:`,summaryData);
            } else {
                // Insert new summary record
                await db.insert(summary).values({
                    caseId: validCaseId,
                    data: JSON.stringify(summaryData),
                    createdAt: new Date(),
                });
            }

            log.info(`Summary data processed for case ${validCaseId}`);
            return true;
        } catch (error) {
            log.error("Error processing summary data:", error);
            throw error;
        }
    };

    ipcMain.handle('edit-category', async (event, data) => {

        const sanitizeJSONString = (jsonString) => {
            return jsonString
                .replace(/: *NaN/g, ": null")
                .replace(/: *undefined/g, ": null")
                .replace(/: *Infinity/g, ": null")
                .replace(/: *-Infinity/g, ": null");
        };

        log.info('Edit Category : ', data);
        const caseId = 26;

        let new_categories = [];
        let transactionsForCase = null;
        let eod_data = null;

        try {
            transactionsForCase = await db
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
        }
        catch (err) {
            log.error("Error fetching transactions for case:", err);
        }

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
            // get eod data 
            eod_data = await db.select().from(eod).where(eq(eod.caseId, caseId));
            eod_data = JSON.parse(eod_data[0].data);
            log.info("EOD data fetched successfully", typeof eod_data);
        }
        catch (err) {
            log.info("Failed to fetch eod data", err);
        }


        try {
            // make api call 
            const serverEndpoint = "http://localhost:7500/edit-category/";

            const payload = {
                transaction_data: updatedTransactions,
                new_categories: transformedCategories,
                eod_data: eod_data
            }

            // use axios 
            const response = await axios.post(serverEndpoint, payload, {
                headers: { "Content-Type": "application/json" },
                timeout: 300000,
                validateStatus: (status) => status === 200,
            });

            // log.info("API response:", typeof response.data);

            const sanitizedJsonString = sanitizeJSONString(response.data);
            parsedData = JSON.parse(sanitizedJsonString);

            try {
                await processSummaryData(
                    {
                        Particulars: parsedData["Particulars"] || [],
                        "Income Receipts": parsedData["Income Receipts"] || [],
                        "Important Expenses": parsedData["Important Expenses"] || [],
                        "Other Expenses": parsedData["Other Expenses"] || [],
                    },
                    caseId
                );
            } catch (error) {
                log.error("Error processing summary data:", error);
                throw error;
            }


            // Process Opportunity to Earn Data
            try {
                await processOpportunityToEarnData(
                    parsedData["Opportunity to Earn"] || [],
                    caseId
                );
            } catch (error) {
                log.error("Error processing opportunity to earn data:", error);
                throw error;
            }

            // log.info("API response:", parsedData);

        }
        catch (error) {
            log.error("API call failed:", error);
            log.error("Failed to make api call");
        }



    })
}

module.exports = { registerCategoryHandlers };