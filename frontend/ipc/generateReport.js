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
const { summary } = require("../db/schema/Summary");
const { failedStatements } = require("../db/schema/FailedStatements");
const { eq, and } = require("drizzle-orm");
const { opportunityToEarn } = require("../db/schema/OpportunityToEarn");


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

  const type =
    transaction.Credit !== null && !isNaN(transaction.Credit)
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
        log.info(
          `Skipping duplicate transaction: ${t.description} on ${t.date}`
        );
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
      throw new Error(
        `Statement ${uniqueTransactions[0].statementId} not found`
      );
    }

    const chunkSize = 50;
    console.log("Unique Transactions : ", uniqueTransactions.length);
    for (let i = 0; i < uniqueTransactions.length; i += chunkSize) {
      const chunk = uniqueTransactions.slice(i, i + chunkSize);
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

const getOrCreateCase = async (caseName, userId = 1) => {
  try {
    // First try to find existing case with exact match on name
    const existingCase = await db
      .select()
      .from(cases)
      .where(
        and(
          eq(cases.name, caseName)
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
        status: "Pending",
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

const processStatementAndEOD = async (
  fileDetail,
  transactions,
  eodData,
  caseName
) => {
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

      const statementResult = await db
        .insert(statements)
        .values(statementData)
        .returning();

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
            log.warn(
              `Invalid transaction skipped: ${error.message}`,
              transaction
            );
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

          .filter((entry) => {
            return (
              entry &&
              typeof entry === "object" &&
              entry.Day !== "Total" &&
              entry.Day !== "Average"
            );
          })
          .map((entry) => {
            try {
              const dayValue =
                typeof entry.Day === "number"
                  ? entry.Day
                  : parseFloat(entry.Day);

              // Validate the day value
              if (isNaN(dayValue)) return null;

              // Process all month keys in the entry
              const processedEntry = { Day: dayValue };

              Object.keys(entry).forEach((key) => {
                if (key !== "Day" && typeof entry[key] !== "undefined") {
                  const monthValue =
                    typeof entry[key] === "number"
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
                updatedAt: new Date(),
              })
              .where(eq(eod.caseId, validCaseId));
          } else {
            await db.insert(eod).values({
              caseId: validCaseId,
              data: JSON.stringify(validatedEODData),
              createdAt: new Date(),
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
      bankName: fileDetail.bankName,
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
const updateCaseStatus = async (caseId, status) => {
  try {
    await db
      .update(cases)
      .set({
        status: status,
        updatedAt: new Date()
      })
      .where(eq(cases.id, caseId));
    
    log.info(`Updated case ${caseId} status to ${status}`);
  } catch (error) {
    log.error(`Failed to update case ${caseId} status to ${status}:`, error);
    throw error;
  }
};


async function processOpportunityToEarnData(opportunityToEarnData, CaseId) {
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

    const validCaseId = await getOrCreateCase(CaseId);

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

function generateReportIpc(tmpdir_path) {
  const baseUrl = `http://localhost:7500`;
  const generateReportEndpoint = `${baseUrl}/analyze-statements/`;
  const editPdfEndpoint = `${baseUrl}/column-rectify-add-pdf/`;
  // const client = axios.create({ socketPath: udsPath, baseURL: 'http://unix' });
  // const payload = {
  //   bank_names: ["ICICI", "HDFC"],
  //   pdf_paths: ['/home/Downloads/ICICI.pdf', '/home/Downloads/HDFC.pdf'],
  //   passwords: ["1234", "1234"],
  //   start_date: ["2023-01-01", "2023-01-01"],
  //   end_date: ["2023-12-31", "2023-12-31"],
  //   ca_id: "DEFAULT_CASE",
  // };
  // const client = new axios.Axios({ socketPath: `unix://${udsPath}`, baseURL: 'http://localhost' });
  // console.log("Client : ", client);
  // client.post("/", 'test', {
  //   headers: { "Content-Type": "application/json" },
  //   timeout: 300000,
  // }).then((res) => {
  //   console.log(res.status);
  //   console.log(res.data);
  // }).catch((err) => {
  //   console.error(err.response.data);
  //   console.error(err.message);
  //   console.error(err.response.data.detail[0].loc);
  // });

  ipcMain.handle("generate-report", async (event, result, caseName) => {
    log.info("IPC handler invoked for generate-report", caseName);
    const tempDir = tmpdir_path;
    log.info("Temp Directory : ", tempDir);
    let caseId = null;


    // Track successfully processed files to avoid deleting them
    const successfulFiles = [];
    const failedFiles = [];

    try {
      caseId = await getOrCreateCase(caseName);
      if (!result?.files?.length) {
        await updateCaseStatus(caseId, 'Failed');
        throw new Error("Invalid or empty files array received");
      }

      const fileDetails = result.files.map((fileDetail, index) => {
        if (!fileDetail.pdf_paths || !fileDetail.bankName) {
          throw new Error(`Missing required fields for file at index ${index}`);
        }

        // log.info("file details", fileDetail);

        const filePath = path.join(tempDir, fileDetail.pdf_paths);

        console.log(`Saving file to ${filePath}`);

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

      const response = await axios.post(generateReportEndpoint, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 300000,
        validateStatus: (status) => status === 200,
      });

      // Track failed PDF paths
      let failedPdfPaths = [];

      // Check if there are any PDF paths not extracted
      if (response.data?.["pdf_paths_not_extracted"]) {
        await updateCaseStatus(caseId, 'Failed');
        // Get the case ID
        const validCaseId = await getOrCreateCase(caseName);

        // Store failed statements in the database
        await db.insert(failedStatements).values({
          caseId: validCaseId,
          data: JSON.stringify(response.data["pdf_paths_not_extracted"]),
        });

        // Track failed PDF paths
        failedPdfPaths = response.data["pdf_paths_not_extracted"].paths || [];
        log.warn("Some PDF paths were not extracted", failedPdfPaths);
      }

      // Continue processing if data exists
      if (!response.data || !response.data.data) {
        throw new Error(
          "Empty or invalid response received from analysis server"
        );
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
          // Track successfully processed files
          successfulFiles.push(fileDetail.pdf_paths);
        } catch (error) {
          // Track failed files
          failedFiles.push(fileDetail.pdf_paths);
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
            "Other Expenses": parsedData["Other Expenses"] || [],
          },
          caseName
        );
      } catch (error) {
        log.error("Error processing summary data:", error);
        throw error;
      }
      console.log(
        "Opportunity to Earn data: 1",
        parsedData["Opportunity to Earn"] || "not data"
      );
      // Process Opportunity to Earn Data
      try {
        await processOpportunityToEarnData(
          parsedData["Opportunity to Earn"] || [],
          payload.ca_id
        );
      } catch (error) {
        log.error("Error processing opportunity to earn data:", error);
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
      await updateCaseStatus(caseId, 'Success');

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
          failedStatements: response.data["pdf_paths_not_extracted"] || null,
          failedFiles: failedFiles,
          successfulFiles: successfulFiles,
        },
      };
    } catch (error) {
      if (caseId) {
        await updateCaseStatus(caseId, 'Failed');
      }
      log.error("Error in report generation:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
      });

      // If there's a specific PDF paths not extracted data, store it
      if (error.response?.data?.["pdf_paths_not_extracted"]) {
        try {
          const validCaseId = await getOrCreateCase(caseName);

          await db.insert(failedStatements).values({
            caseId: validCaseId,
            data: JSON.stringify(
              error.response.data["pdf_paths_not_extracted"]
            ),
          });

          // Track failed PDF paths
          const failedPdfPaths =
            error.response.data["pdf_paths_not_extracted"].paths || [];
          failedFiles.push(...failedPdfPaths);
        } catch (dbError) {
          log.error("Failed to store failed statements:", dbError);
        }
      }

      throw {
        message: error.message || "Failed to generate report",
        code: error.response?.status || 500,
        details: error.response?.data || error.toString(),
        timestamp: new Date().toISOString(),
        failedFiles: failedFiles,
      };
    }
  });

  ipcMain.handle("edit-pdf", async (event, result, caseName) => {
    log.info("IPC handler invoked for edit-pdf", caseName);
    const tempDir = tmpdir_path;
    log.info("Temp Directory : ", tempDir);
    let caseId = null;
    console.log("CaseName backend edit pdf: ", caseName);
    console.log("Result backend edit pdf: ", result);

    // Track successfully processed files to avoid deleting them
    const successfulFiles = [];
    const failedFiles = [];

    try {
      caseId = await getOrCreateCase(caseName);

     

      const payload = {
        bank_names: result.map((d) => d.bankName),
        pdf_paths: result.map((d) => d.path),
        passwords: result.map((d) => d.passwords || ""),
        start_dates: result.map((d) => d.start_date || ""),
        end_dates: result.map((d) => d.end_date || ""),
        ca_id:caseId|| "DEFAULT_CASE",
        aiyaz_array_of_array:result.map((d) => d.rectifiedColumns || ""),
        // whole_transaction_sheet:result.map((d) => d.whole_transaction_sheet || ""),
      };

      log.info("aiyaz Payload: ", payload);


      const response = await axios.post(editPdfEndpoint, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 300000,
        validateStatus: (status) => status === 200,
      });

      log.info("Response from edit-pdf: ", response);
      log.info("Response data from edit-pdf: ", response.data);

      // // Track failed PDF paths
      // let failedPdfPaths = [];

      // // Check if there are any PDF paths not extracted
      // if (response.data?.["pdf_paths_not_extracted"]) {
      //   await updateCaseStatus(caseId, 'Failed');
      //   // Get the case ID
      //   const validCaseId = await getOrCreateCase(caseName);

      //   // Store failed statements in the database
      //   await db.insert(failedStatements).values({
      //     caseId: validCaseId,
      //     data: JSON.stringify(response.data["pdf_paths_not_extracted"]),
      //   });

      //   // Track failed PDF paths
      //   failedPdfPaths = response.data["pdf_paths_not_extracted"].paths || [];
      //   log.warn("Some PDF paths were not extracted", failedPdfPaths);
      // }

      // // Continue processing if data exists
      // if (!response.data || !response.data.data) {
      //   throw new Error(
      //     "Empty or invalid response received from analysis server"
      //   );
      // }

      // let parsedData;
      // try {
      //   const sanitizedJsonString = sanitizeJSONString(response.data.data);
      //   parsedData = JSON.parse(sanitizedJsonString);
      // } catch (error) {
      //   log.error("JSON parsing error:", error);
      //   throw error;
      // }

      // const transactions = (parsedData.Transactions || []).filter(
      //   (transaction) => {
      //     if (
      //       typeof transaction.Credit === "number" &&
      //       isNaN(transaction.Credit)
      //     ) {
      //       transaction.Credit = null;
      //     }
      //     if (
      //       typeof transaction.Debit === "number" &&
      //       isNaN(transaction.Debit)
      //     ) {
      //       transaction.Debit = null;
      //     }
      //     if (
      //       typeof transaction.Balance === "number" &&
      //       isNaN(transaction.Balance)
      //     ) {
      //       transaction.Balance = 0;
      //     }

      //     return (
      //       (transaction.Credit !== null && !isNaN(transaction.Credit)) ||
      //       (transaction.Debit !== null && !isNaN(transaction.Debit))
      //     );
      //   }
      // );

      // const processedData = [];
      // for (const fileDetail of fileDetails) {
      //   try {
      //     const result = await processStatementAndEOD(
      //       fileDetail,
      //       transactions,
      //       parsedData.EOD,
      //       caseName
      //     );
      //     processedData.push(result);
      //     // Track successfully processed files
      //     successfulFiles.push(fileDetail.pdf_paths);
      //   } catch (error) {
      //     // Track failed files
      //     failedFiles.push(fileDetail.pdf_paths);
      //     log.error(
      //       `Error processing file detail for ${fileDetail.bankName}:`,
      //       error
      //     );
      //     throw error;
      //   }
      // }

      // // Process Summary Data
      // try {
      //   await processSummaryData(
      //     {
      //       "Income Receipts": parsedData["Income Receipts"] || [],
      //       "Important Expenses": parsedData["Important Expenses"] || [],
      //       "Other Expenses": parsedData["Other Expenses"] || [],
      //     },
      //     caseName
      //   );
      // } catch (error) {
      //   log.error("Error processing summary data:", error);
      //   throw error;
      // }
      // console.log(
      //   "Opportunity to Earn data: 1",
      //   parsedData["Opportunity to Earn"] || "not data"
      // );
      // // Process Opportunity to Earn Data
      // try {
      //   await processOpportunityToEarnData(
      //     parsedData["Opportunity to Earn"] || [],
      //     payload.ca_id
      //   );
      // } catch (error) {
      //   log.error("Error processing opportunity to earn data:", error);
      //   throw error;
      // }

      // // Cleanup
      // fileDetails.forEach((detail) => {
      //   try {
      //     if (fs.existsSync(detail.pdf_paths)) {
      //       fs.unlinkSync(detail.pdf_paths);
      //     }
      //   } catch (error) {
      //     log.warn(`Failed to cleanup temp file: ${detail.pdf_paths}`, error);
      //   }
      // });
      // await updateCaseStatus(caseId, 'Success');

      return {
        success: true,
        // data: {
        //   processed: processedData,
        //   totalTransactions: processedData.reduce(
        //     (sum, d) => sum + d.transactionCount,
        //     0
        //   ),
        //   eodProcessed: true,
        //   summaryProcessed: true,
        //   failedStatements: response.data["pdf_paths_not_extracted"] || null,
        //   failedFiles: failedFiles,
        //   successfulFiles: successfulFiles,
        // },
      };
    } catch (error) {
      if (caseId) {
        await updateCaseStatus(caseId, 'Failed');
      }
      log.error("Error in report generation:", {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
      });

      // If there's a specific PDF paths not extracted data, store it
      if (error.response?.data?.["pdf_paths_not_extracted"]) {
        try {
          const validCaseId = await getOrCreateCase(caseName);

          await db.insert(failedStatements).values({
            caseId: validCaseId,
            data: JSON.stringify(
              error.response.data["pdf_paths_not_extracted"]
            ),
          });

          // Track failed PDF paths
          const failedPdfPaths =
            error.response.data["pdf_paths_not_extracted"].paths || [];
          failedFiles.push(...failedPdfPaths);
        } catch (dbError) {
          log.error("Failed to store failed statements:", dbError);
        }
      }

      throw {
        message: error.message || "Failed to generate report",
        code: error.response?.status || 500,
        details: error.response?.data || error.toString(),
        timestamp: new Date().toISOString(),
        failedFiles: failedFiles,
      };
    }
  });

 
}

module.exports = { generateReportIpc };
