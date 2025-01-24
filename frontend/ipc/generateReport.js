const { ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");
const log = require("electron-log");
const axios = require("axios");
const db = require("../db/db");
const { transactions } = require("../db/schema/Transactions");
const { statements } = require("../db/schema/Statement");
const { cases } = require("../db/schema/Cases");
const { eod } = require("../db/schema/Eod");
const {summary} = require("../db/schema/Summary");
const { eq, and } = require("drizzle-orm");

const sanitizeJSONString = (jsonString) => {
  return jsonString
    .replace(/: *NaN/g, ": null")
    .replace(/: *undefined/g, ": null")
    .replace(/: *Infinity/g, ": null")
    .replace(/: *-Infinity/g, ": null");
};

const validateAndTransformTransaction = (transaction, statementId) => {
  if (!transaction["Value Date"] || !transaction.Description) {
    throw new Error("Missing required transaction fields");
  }

  let date = null;
  try {
    const [day, month, year] = transaction["Value Date"].split("-");
    date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
  } catch (error) {
    throw new Error(`Invalid date format: ${transaction["Value Date"]}`);
  }

  let amount = 0;
  if (transaction.Credit !== null && !isNaN(transaction.Credit)) {
    amount = Math.abs(transaction.Credit);
  } else if (transaction.Debit !== null && !isNaN(transaction.Debit)) {
    amount = Math.abs(transaction.Debit);
  }

  let balance = 0;
  if (transaction.Balance !== null && !isNaN(transaction.Balance)) {
    balance = parseFloat(transaction.Balance);
  }

  const type = transaction.Credit !== null && !isNaN(transaction.Credit)
    ? "credit"
    : "debit";

  return {
    statementId,
    date: date,
    description: transaction.Description,
    amount: amount,
    category: transaction.Category || "uncategorized",
    type: type,
    balance: balance,
    entity: transaction.Bank || "unknown",
  };
};

const isDuplicateTransaction = async (transaction, statementId) => {
  const existing = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.statementId, statementId),
        eq(transactions.date, transaction.date),
        eq(transactions.amount, transaction.amount),
        eq(transactions.description, transaction.description)
      )
    );
  return existing.length > 0;
};

const storeTransactionsBatch = async (transformedTransactions) => {
  try {
    if (transformedTransactions.length === 0) return;

    const uniqueTransactions = [];
    for (const t of transformedTransactions) {
      const isDuplicate = await isDuplicateTransaction(t, t.statementId);
      if (!isDuplicate) {
        uniqueTransactions.push({
          statementId: t.statementId.toString(),
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category,
          type: t.type,
          balance: t.balance,
          entity: t.entity,
        });
      } else {
        log.info(`Skipping duplicate transaction: ${t.description} on ${t.date}`);
      }
    }

    if (uniqueTransactions.length === 0) {
      log.info("No new unique transactions to store");
      return true;
    }

    const existingStatements = await db
      .select()
      .from(statements)
      .where(eq(statements.id, uniqueTransactions[0].statementId));

    if (existingStatements.length === 0) {
      throw new Error(`Statement ${uniqueTransactions[0].statementId} not found`);
    }

    const chunkSize = 50;
    console.log("Unique Transactions : ", uniqueTransactions.length);
    for (let i = 0; i < uniqueTransactions.length; i += chunkSize) {
      const chunk = uniqueTransactions.slice(i, i + chunkSize);
      await db.insert(transactions).values(chunk);
      log.info(`Stored transactions batch ${i / chunkSize + 1}, size: ${chunk.length}`);
    }

    return true;
  } catch (error) {
    log.error("Error storing transactions batch:", error);
    throw error;
  }
};

const getOrCreateCase = async (caseName, userId = 1) => {
  try {
    // First try to find existing case with exact match on name
    const existingCase = await db
      .select()
      .from(cases)
      .where(
        and(
          eq(cases.name, caseName),
          // eq(cases.userId, userId),
          // eq(cases.status, "active")
        )
      )
      .limit(1);

    if (existingCase.length > 0) {
      log.info(`Found existing case with ID: ${existingCase[0].id}`);
      return existingCase[0].id;
    }

    // Create new case if not found
    const newCase = await db
      .insert(cases)
      .values({
        name: caseName,
        userId: userId,
        status: "active",
        createdAt: new Date(),
      })
      .returning();

    if (newCase.length > 0) {
      log.info(`Created new case with ID: ${newCase[0].id}`);
      return newCase[0].id;
    }

    throw new Error("Failed to create or find case");
  } catch (error) {
    log.error("Error in getOrCreateCase:", error);
    throw error;
  }
};

//Session Management Implementation required:
// const getOrCreateCase = async (caseId) => {
//   try {
//     // First try to find existing case
//     const existingCase = await db
//       .select({
//         id: cases.id,
//       })
//       .from(cases)
//       .where(eq(cases.id, caseId))
//       .limit(1);

//     if (existingCase.length > 0) {
//       log.info(`Found existing case with ID: ${existingCase[0].id}`);
//       return existingCase[0].id;
//     }

//     // Get user ID from session
//     const { userId } = await sessionManager.getUser();
//     if (!userId) {
//       throw new Error("User ID not found in session");
//     }

//     // Create new case if not found
//     const newCase = await db
//       .insert(cases)
//       .values({
//         name: caseId,
//         userId,
//         status: "active",
//         createdAt: new Date(),
//       })
//       .returning();

//     if (newCase.length > 0) {
//       log.info(`Created new case with ID: ${newCase[0].id}`);
//       return newCase[0].id;
//     }

//     throw new Error("Failed to create or find case");
//   } catch (error) {
//     log.error("Error in getOrCreateCase:", error);
//     throw error;
//   }
// };

const processStatementAndEOD = async (fileDetail, transactions, eodData, caseName) => {
  try {
    const validCaseId = await getOrCreateCase(caseName);
    let statementId = null;
    let processedTransactions = 0;

    // Process Statement and Transactions
    try {
      const statementData = {
        caseId: validCaseId,
        accountNumber: fileDetail.accountNumber || "UNKNOWN",
        customerName: fileDetail.customerName || "UNKNOWN",
        ifscCode: fileDetail.ifscCode || null,
        bankName: fileDetail.bankName,
        filePath: fileDetail.pdf_paths,
        createdAt: new Date(),
      };

      const statementResult = await db.insert(statements).values(statementData).returning();
      
      if (!statementResult || statementResult.length === 0) {
        throw new Error("Failed to create statement record");
      }

      statementId = statementResult[0].id;
      
      // Process transactions for this statement
      const statementTransactions = transactions
        .filter((t) => t.Bank === fileDetail.bankName)
        .map((transaction) => {
          try {
            return validateAndTransformTransaction(transaction, statementId);
          } catch (error) {
            log.warn(`Invalid transaction skipped: ${error.message}`, transaction);
            return null;
          }
        })
        .filter(Boolean);

      await storeTransactionsBatch(statementTransactions);
      processedTransactions = statementTransactions.length;
    } catch (error) {
      log.error("Error processing statement and transactions:", error);
      throw error;
    }

    // Process EOD data if available
    if (eodData && Array.isArray(eodData)) {
      try {
        // Check if EOD data already exists for this case
        const existingEOD = await db
          .select()
          .from(eod)
          .where(eq(eod.caseId, validCaseId));

          const validatedEODData = eodData
          .filter(entry => {
            return (
              entry &&
              typeof entry === "object" &&
              entry.Day !== "Total" &&
              entry.Day !== "Average"
            );
          })
          .map(entry => {
            try {
              const dayValue = typeof entry.Day === "number" 
                ? entry.Day 
                : parseFloat(entry.Day);
        
              // Validate the day value
              if (isNaN(dayValue)) return null;
        
              // Process all month keys in the entry
              const processedEntry = { Day: dayValue };
        
              Object.keys(entry).forEach(key => {
                if (key !== "Day" && typeof entry[key] !== "undefined") {
                  const monthValue = typeof entry[key] === "number" 
                    ? entry[key] 
                    : parseFloat(entry[key]);
        
                  // Only include valid numeric month values
                  if (!isNaN(monthValue)) {
                    processedEntry[key] = monthValue;
                  }
                }
              });
        
              // If no valid month values are found, return null
              if (Object.keys(processedEntry).length === 1) return null;
        
              return processedEntry;
            } catch (error) {
              log.warn("Error processing EOD entry:", error, entry);
              return null;
            }
          })
          .filter(Boolean);
        

        // log.info(`Validated EOD data for case ${validCaseId}:`, validatedEODData);

        if (validatedEODData.length > 0) {
          if (existingEOD.length > 0) {
            await db
              .update(eod)
              .set({
                data: JSON.stringify(validatedEODData),
                updatedAt: new Date()
              })
              .where(eq(eod.caseId, validCaseId));
          } else {
            await db.insert(eod).values({
              caseId: validCaseId,
              data: JSON.stringify(validatedEODData),
              createdAt: new Date()
            });
          }
        }
      } catch (error) {
        log.error("Error processing EOD data:", error);
        throw error;
      }
    }

    return {
      statementId,
      transactionCount: processedTransactions,
      bankName: fileDetail.bankName
    };
  } catch (error) {
    log.error("Error in processStatementAndEOD:", error);
    throw error;
  }
};


const processSummaryData = async (parsedData, caseName) => {
  try {
    const validCaseId = await getOrCreateCase(caseName);

    // Validate the summary data
    if (
      !parsedData ||
      typeof parsedData !== "object" ||
      !parsedData["Income Receipts"] ||
      !parsedData["Important Expenses"] ||
      !parsedData["Other Expenses"]
    ) {
      throw new Error("Invalid summary data provided");
    }

    // Prepare summary data object
    const summaryData = {
      incomeReceipts: parsedData["Income Receipts"],
      importantExpenses: parsedData["Important Expenses"],
      otherExpenses: parsedData["Other Expenses"]
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
function generateReportIpc() {
  ipcMain.handle("generate-report", async (event, result, caseName) => {
    log.info("IPC handler invoked for generate-report", caseName);
    const tempDir = path.join(__dirname, "..", "tmp");

    try {
      if (!result?.files?.length) {
        throw new Error("Invalid or empty files array received");
      }

      fs.mkdirSync(tempDir, { recursive: true });

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

      const payload = {
        bank_names: fileDetails.map((d) => d.bankName),
        pdf_paths: fileDetails.map((d) => d.pdf_paths),
        passwords: fileDetails.map((d) => d.passwords || ""),
        start_date: fileDetails.map((d) => d.start_date || ""),
        end_date: fileDetails.map((d) => d.end_date || ""),
        ca_id: fileDetails[0]?.ca_id || "DEFAULT_CASE",
      };

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

      let parsedData;
      try {
        const sanitizedJsonString = sanitizeJSONString(response.data.data);
        parsedData = JSON.parse(sanitizedJsonString);
      } catch (error) {
        log.error("JSON parsing error:", error);
        throw error;
      }

      const transactions = (parsedData.Transactions || []).filter(
        (transaction) => {
          if (typeof transaction.Credit === "number" && isNaN(transaction.Credit)) {
            transaction.Credit = null;
          }
          if (typeof transaction.Debit === "number" && isNaN(transaction.Debit)) {
            transaction.Debit = null;
          }
          if (typeof transaction.Balance === "number" && isNaN(transaction.Balance)) {
            transaction.Balance = 0;
          }

          return (
            (transaction.Credit !== null && !isNaN(transaction.Credit)) ||
            (transaction.Debit !== null && !isNaN(transaction.Debit))
          );
        }
      );

      const processedData = [];
      for (const fileDetail of fileDetails) {
        try {
          const result = await processStatementAndEOD(
            fileDetail,
            transactions,
            parsedData.EOD,
            caseName
          );
          processedData.push(result);
        } catch (error) {
          log.error(
            `Error processing file detail for ${fileDetail.bankName}:`,
            error
          );
          throw error;
        }
      }

      // Process Summary Data
      try {
        await processSummaryData(
          {
            "Income Receipts": parsedData["Income Receipts"] || [],
            "Important Expenses": parsedData["Important Expenses"] || [],
            "Other Expenses": parsedData["Other Expenses"] || []
          },
          caseName
        );
      } catch (error) {
        log.error("Error processing summary data:", error);
        throw error;
      }

      // Cleanup
      fileDetails.forEach((detail) => {
        try {
          if (fs.existsSync(detail.pdf_paths)) {
            fs.unlinkSync(detail.pdf_paths);
          }
        } catch (error) {
          log.warn(`Failed to cleanup temp file: ${detail.pdf_paths}`, error);
        }
      });

      try {
        if (fs.existsSync(tempDir)) {
          fs.rmdirSync(tempDir);
        }
      } catch (error) {
        log.warn("Failed to remove temp directory:", error);
      }

      return {
        success: true,
        data: {
          processed: processedData,
          totalTransactions: processedData.reduce(
            (sum, d) => sum + d.transactionCount,
            0
          ),
          eodProcessed: true,
          summaryProcessed: true,
        },
      };
    } catch (error) {
      // Cleanup on error
      try {
        if (fs.existsSync(tempDir)) {
          fs.readdirSync(tempDir).forEach((file) => {
            try {
              const filePath = path.join(tempDir, file);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
            } catch (e) {
              log.warn(`Failed to delete temp file ${file}:`, e);
            }
          });
          fs.rmdirSync(tempDir);
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
module.exports = { generateReportIpc };