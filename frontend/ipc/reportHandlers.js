const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const log = require("electron-log");
const axios = require("axios");
const db = require("../db/db");
const { transactions } = require("../db/schema/Transactions");
const { statements } = require("../db/schema/Statement");
const { cases } = require("../db/schema/Cases");
const { eq, and } = require("drizzle-orm");


// Helper function to sanitize JSON string
const sanitizeJSONString = (jsonString) => {
    return jsonString
        .replace(/: *NaN/g, ": null")
        .replace(/: *undefined/g, ": null")
        .replace(/: *Infinity/g, ": null")
        .replace(/: *-Infinity/g, ": null");
};

// Helper function to validate and transform transaction data
const validateAndTransformTransaction = (transaction, statementId) => {
    if (!transaction["Value Date"] || !transaction.Description) {
        throw new Error("Missing required transaction fields");
    }

    // Parse date properly from DD-MM-YYYY format
    let date = null;
    try {
        const [day, month, year] = transaction["Value Date"].split("-");
        date = new Date(year, month - 1, day); // month is 0-based in JS
        if (isNaN(date.getTime())) {
            throw new Error("Invalid date");
        }
    } catch (error) {
        throw new Error(`Invalid date format: ${transaction["Value Date"]}`);
    }

    // Fixed amount handling logic
    let amount = 0;
    if (transaction.Credit !== null && !isNaN(transaction.Credit)) {
        amount = Math.abs(transaction.Credit); // Ensure positive for credits
    } else if (transaction.Debit !== null && !isNaN(transaction.Debit)) {
        amount = Math.abs(transaction.Debit); // Keep debit amounts positive if that's what you want
    }

    let balance = 0;
    if (transaction.Balance !== null && !isNaN(transaction.Balance)) {
        balance = parseFloat(transaction.Balance);
    }

    // Determine transaction type based on whether it was a Credit or Debit
    const type =
        transaction.Credit !== null && !isNaN(transaction.Credit)
            ? "credit"
            : "debit";

    return {
        statementId,
        date: date,
        description: transaction.Description,
        amount: amount, // Now preserving the original sign
        category: transaction.Category || "uncategorized",
        type: type, // Type is now determined by the transaction field used, not the amount sign
        balance: balance,
        entity: transaction.Bank || "unknown",
    };
};

const logTransactionDetails = (original, transformed) => {
    log.info("Transaction transformation:", {
        original: {
            valueDate: original["Value Date"],
            description: original.Description,
            credit: original.Credit,
            debit: original.Debit,
            balance: original.Balance,
        },
        transformed: {
            date: transformed.date,
            description: transformed.description,
            amount: transformed.amount,
            type: transformed.type,
            balance: transformed.balance,
        },
    });
};

// Helper function to ensure case exists
const ensureCaseExists = async (caseId, userId = 1) => {
    try {
        // Check if case exists
        const existingCase = await db
            .select()
            .from(cases)
            .where(eq(cases.id, caseId));

        if (existingCase.length === 0) {
            throw new Error("Case does not exist");
            // Create new case if it doesn't exist
            // const newCase = await db
            //     .insert(cases)
            //     .values({
            //         // id: caseId,
            //         name: caseId,
            //         userId: userId,
            //         status: "active",
            //         createdAt: new Date(),
            //     })
            //     .returning();

            // if (newCase.length > 0) {
            //     return newCase[0].id;

            // }

            // log.info(`Created new case with ID: ${caseId}`);
        }

        // return existingCase[0].id;

    } catch (error) {
        log.error("Error ensuring case exists:", error);
        throw error;
    }
};

// Helper function to store transactions in batches
// Modified store transactions batch with validation
const storeTransactionsBatch = async (transformedTransactions) => {
    try {
        if (transformedTransactions.length === 0) return;

        const dbTransactions = transformedTransactions.map((t) => {
            // Log each transaction for verification
            log.info(
                `Processing transaction: ${t.description}, Amount: ${t.amount}, Type: ${t.type}`
            );

            return {
                statementId: t.statementId.toString(),
                date: t.date,
                description: t.description,
                amount: t.amount, // Using the corrected amount
                category: t.category,
                type: t.type,
                balance: t.balance,
                entity: t.entity,
            };
        });

        // Verify statement exists before inserting transactions
        const existingStatements = await db
            .select()
            .from(statements)
            .where(eq(statements.id, dbTransactions[0].statementId));

        if (existingStatements.length === 0) {
            throw new Error(`Statement ${dbTransactions[0].statementId} not found`);
        }

        // Insert transactions in chunks
        const chunkSize = 20;
        for (let i = 0; i < dbTransactions.length; i += chunkSize) {
            const chunk = dbTransactions.slice(i, i + chunkSize);
            await db.insert(transactions).values(chunk);
            log.info(
                `Stored transactions batch ${i / chunkSize + 1}, size: ${chunk.length}`
            );
        }

        return true;
    } catch (error) {
        log.error("Error storing transactions batch:", error);
        throw error;
    }
};

// Helper function to create statement record
const createStatement = async (fileDetail, caseId) => {
    try {
        // Ensure case exists before creating statement
        await ensureCaseExists(caseId);

        const statementData = {
            caseId: caseId,
            accountNumber: fileDetail.accountNumber || "UNKNOWN",
            customerName: fileDetail.customerName || "UNKNOWN",
            ifscCode: fileDetail.ifscCode || null,
            bankName: fileDetail.bankName,
            filePath: fileDetail.pdf_paths,
            createdAt: new Date(),
        };

        const result = await db.insert(statements).values(statementData);
        log.info("Created statement record");
        return result.lastInsertRowid.toString();
    } catch (error) {
        log.error("Error creating statement record:", error);
        throw error;
    }
};

// Helper function to process transactions
const processTransactions = async (transactions, fileDetail, statementId) => {
    try {
        // Transform and validate transactions for this statement
        const statementTransactions = transactions
            .filter((t) => t.Bank === fileDetail.bankName)
            .map((transaction) => {
                try {
                    return validateAndTransformTransaction(transaction, statementId);
                } catch (error) {
                    log.warn(
                        `Invalid transaction skipped: ${error.message}`,
                        transaction
                    );
                    return null;
                }
            })
            .filter(Boolean); // Remove null entries

        // Store the validated transactions
        await storeTransactionsBatch(statementTransactions);

        return statementTransactions.length;
    } catch (error) {
        log.error(
            `Error processing transactions for ${fileDetail.bankName}:`,
            error
        );
        throw error;
    }
};


async function getModifiedTransactions() {

    try {
        const result = await db.select().from(transactions);

        return result;
    }
    catch (e) {
        console.log("Error fetching modified transactions: ", e);
    }
}


function registerReportHandlers(tmpdir_path) {
    ipcMain.handle("get-recent-reports", async (event) => {
        try {

            const result = await db
                .select()
                .from(cases)
                .orderBy(cases.createdAt, "DESC")
                .leftJoin(statements, eq(cases.id, statements.caseId))
                .limit(10);

            const groupedResults = result.reduce((acc, row) => {
                const caseId = row.cases.id; // Use 'cases.id' to group by case

                if (!acc[caseId]) {
                    acc[caseId] = { ...row.cases, statements: [] };
                }

                if (row.statements) {
                    acc[caseId].statements.push({ ...row.statements }); // Make sure you're adding the full statement object
                }

                return acc;
            }, {});

            const finalResults = Object.values(groupedResults);
            return finalResults;
        } catch (error) {
            log.error("Error fetching reports:", error);
            throw error;
        }
    });




    // Main IPC handler function
    ipcMain.handle("add-pdf", async (event, result, caseId) => {
        log.info("IPC handler invoked for add-pdf");
        const tempDir = tmpdir_path
        log.info("Temp Directory : ", tempDir);
        log.info("CASE ID : ", caseId);
        try {
            // Input validation
            if (!result?.files?.length) {
                throw new Error("Invalid or empty files array received");
            }

            log.info(
                "Processing request with files:",
                result.files.map((f) => ({
                    bankName: f.bankName,
                    start_date: f.start_date,
                    end_date: f.end_date,
                }))
            );

            // Create temp directory
            // fs.mkdirSync(tempDir, { recursive: true });

            // Process file details
            const fileDetails = result.files.map((fileDetail, index) => {
                if (!fileDetail.pdf_paths || !fileDetail.bankName) {
                    throw new Error(`Missing required fields for file at index ${index}`);
                }

                const filePath = path.join(tempDir, fileDetail.pdf_paths);

                if (fileDetail.fileContent) {
                    fs.writeFileSync(filePath, fileDetail.fileContent, "binary");
                } else {
                    log.warn(`No file content for ${fileDetail.bankName}`);
                }

                return {
                    ...fileDetail,
                    pdf_paths: filePath,
                    start_date: fileDetail.start_date || "",
                    end_date: fileDetail.end_date || "",
                };
            });

            // Prepare API payload
            const payload = {
                bank_names: fileDetails.map((d) => d.bankName),
                pdf_paths: fileDetails.map((d) => d.pdf_paths),
                passwords: fileDetails.map((d) => d.passwords || ""),
                start_date: fileDetails.map((d) => d.start_date || ""),
                end_date: fileDetails.map((d) => d.end_date || ""),
                ca_id: fileDetails[0]?.ca_id || "DEFAULT_CASE",
            };

            // Make API request
            const response = await axios.post(
                "http://localhost:7500/analyze-statements/",
                payload,
                {
                    headers: { "Content-Type": "application/json" },
                    timeout: 300000,
                    validateStatus: (status) => status === 200,
                }
            );

            if (!response.data) {
                throw new Error("Empty response received from analysis server");
            }

            log.info("Received response from analysis server");

            // Parse and sanitize response data
            let parsedData;
            try {
                const sanitizedJsonString = sanitizeJSONString(response.data.data);
                parsedData = JSON.parse(sanitizedJsonString);
            } catch (error) {
                log.error("JSON parsing error:", error);
                log.error("Problematic JSON string:", sanitizedJsonString);
                throw new Error("Failed to parse response data: " + error.message);
            }

            // Filter and validate transactions
            const transactions = (parsedData.Transactions || []).filter(
                (transaction) => {
                    if (
                        typeof transaction.Credit === "number" &&
                        isNaN(transaction.Credit)
                    ) {
                        transaction.Credit = null;
                    }
                    if (
                        typeof transaction.Debit === "number" &&
                        isNaN(transaction.Debit)
                    ) {
                        transaction.Debit = null;
                    }
                    if (
                        typeof transaction.Balance === "number" &&
                        isNaN(transaction.Balance)
                    ) {
                        transaction.Balance = 0;
                    }

                    return (
                        (transaction.Credit !== null && !isNaN(transaction.Credit)) ||
                        (transaction.Debit !== null && !isNaN(transaction.Debit))
                    );
                }
            );

            log.info(
                `Extracted ${transactions.length} valid transactions from response`
            );

            // Process each file detail and its transactions
            const processedData = [];
            for (const fileDetail of fileDetails) {
                try {
                    const statementId = await createStatement(fileDetail, caseId);
                    const transactionCount = await processTransactions(
                        transactions,
                        fileDetail,
                        statementId
                    );

                    processedData.push({
                        statementId,
                        bankName: fileDetail.bankName,
                        transactionCount,
                    });
                } catch (error) {
                    log.error(
                        `Error processing file detail for ${fileDetail.bankName}:`,
                        error
                    );
                }
            }

            // Cleanup temp files
            fileDetails.forEach((detail) => {
                try {
                    fs.unlinkSync(detail.pdf_paths);
                } catch (error) {
                    log.warn(`Failed to cleanup temp file: ${detail.pdf_paths}`, error);
                }
            });

            // try {
            //     fs.rmdirSync(tempDir);
            // } catch (error) {
            //     log.warn("Failed to remove temp directory:", error);
            // }

            return {
                success: true,
                data: {
                    processed: processedData,
                    totalTransactions: processedData.reduce(
                        (sum, d) => sum + d.transactionCount,
                        0
                    ),
                },
            };
        } catch (error) {
            // Cleanup on error
            try {
                if (fs.existsSync(tempDir)) {
                    fs.readdirSync(tempDir).forEach((file) => {
                        try {
                            fs.unlinkSync(path.join(tempDir, file));
                        } catch (e) {
                            log.warn(`Failed to delete temp file ${file}:`, e);
                        }
                    });
                    // fs.rmdirSync(tempDir);
                }
            } catch (cleanupError) {
                log.warn("Error during cleanup:", cleanupError);
            }

            log.error("Error in report generation:", {
                message: error.message,
                stack: error.stack,
                response: error.response?.data,
                status: error.response?.status,
            });

            throw {
                message: error.message || "Failed to generate report",
                code: error.response?.status || 500,
                details: error.response?.data || error.toString(),
                timestamp: new Date().toISOString(),
            };
        }
    });
}


module.exports = { registerReportHandlers };