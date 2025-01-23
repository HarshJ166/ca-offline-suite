const { ipcMain } = require("electron");
const log = require("electron-log");
const db = require("../db/db");
const { statements } = require("../db/schema/Statement");
const { transactions } = require("../db/schema/Transactions");
const { eod } = require("../db/schema/Eod");
const { summary } = require("../db/schema/Summary");
const { eq, and, inArray } = require("drizzle-orm"); // Add this import

function registerIndividualDashboardIpc() {
  // Handler for getting EOD balance
  ipcMain.handle('get-eod-balance', async (event, caseId) => {
    if (!caseId) {
      log.error('Invalid caseId provided:', caseId);
      throw new Error('Invalid case ID');
    }

    try {
      const result = await db
        .select()
        .from(eod)
        .where(eq(eod.caseId, caseId));

      // log.info('EOD balance fetched successfully',result);
      return result;

    } catch (error) {
      log.error('Error fetching EOD balance:', error);
      throw new Error('Failed to fetch EOD balance');
    }
  });

  // Handler for getting summary data
  ipcMain.handle("get-summary", async (event, caseId) => {
    try {
      const result = await db
        .select()
        .from(summary)
        .where(eq(summary.caseId, caseId));
      log.info("Summary data fetched successfully:", result);
      return result;
    } catch (error) {
      log.error("Error fetching summary data:", error);
      throw error;
    }
  });

  // Handler for getting all transactions
  ipcMain.handle("get-transactions", async (event, caseId) => {
    try {
      // Get all statements for the case
      const allStatements = await db
        .select()
        .from(statements)
        .where(eq(statements.caseId, caseId));

      if (allStatements.length === 0) {
        log.info("No statements found for case:", caseId);
        return [];
      }

      // Log statements for debugging
      log.info("Found statements:", allStatements);

      // Get all transactions for these statements
      const allTransactions = await db
        .select()
        .from(transactions)
        .where(
          inArray(
            transactions.statementId,
            allStatements.map((stmt) => stmt.id.toString()) // Convert integer ID to string
          )
        );

      log.info("Transactions fetched successfully:", allTransactions);
      return allTransactions;
    } catch (error) {
      log.error("Error fetching transactions:", error);
      throw error;
    }
  });

  ipcMain.handle("get-transactions-by-debtor", async (event, caseId) => {
    try {
      const allStatements = await db
        .select()
        .from(statements)
        .where(eq(statements.caseId, caseId));

      const statementIds = allStatements.map((stmt) => stmt.id.toString());

      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            inArray(transactions.statementId, statementIds), // Check if statementId is in the list
            eq(transactions.category, "Debtor") // Filter by category
          )
        ); // Apply both filters

      return result;
    } catch (error) {
      log.error("Error fetching transactions:", error);
      throw error;
    }
  });

  ipcMain.handle("get-transactions-by-creditor", async (event, caseId) => {
    try {
      const allStatements = await db
        .select()
        .from(statements)
        .where(eq(statements.caseId, caseId));

      const statementIds = allStatements.map((stmt) => stmt.id.toString());

      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            inArray(transactions.statementId, statementIds), // Check if statementId is in the list
            eq(transactions.category, "Creditor") // Filter by category
          )
        ); // Apply both filters

      return result;
    } catch (error) {
      log.error("Error fetching transactions with category 'creditor':", error);
      throw error;
    }
  });

  ipcMain.handle(
    "get-transactions-by-cashwithdrawal",
    async (event, caseId) => {
      try {
        const allStatements = await db
          .select()
          .from(statements)
          .where(eq(statements.caseId, caseId));

        const statementIds = allStatements.map((stmt) => stmt.id.toString());

        const result = await db
          .select()
          .from(transactions)
          .where(
            and(
              inArray(transactions.statementId, statementIds), // Check if statementId is in the list
              eq(transactions.category, "Cash Withdrawal") // Filter by category
            )
          ); // Apply both filters

        log.info("Transactions with category 'Cash withdrawal':", result);

        return result;
      } catch (error) {
        log.error(
          "Error fetching transactions with category 'Cash withdrawal':",
          error
        );
        throw error;
      }
    }
  );

  ipcMain.handle("get-transactions-by-cashdeposit", async (event, caseId) => {
    try {
      const allStatements = await db
        .select()
        .from(statements)
        .where(eq(statements.caseId, caseId));

      const statementIds = allStatements.map((stmt) => stmt.id.toString());

      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            inArray(transactions.statementId, statementIds), // Check if statementId is in the list
            eq(transactions.category, "Cash Deposits") // Filter by category
          )
        ); // Apply both filters

      return result;
    } catch (error) {
      log.error(
        "Error fetching transactions with category 'Cash deposits':",
        error
      );
      throw error;
    }
  });

  // Handler for getting Suspense Credit transactions
  ipcMain.handle(
    "get-transactions-by-suspensecredit",
    async (event, caseId) => {
      try {
        const allStatements = await db
          .select()
          .from(statements)
          .where(eq(statements.caseId, caseId));

        const statementIds = allStatements.map((stmt) => stmt.id.toString());

        const result = await db
          .select()
          .from(transactions)
          .where(
            and(
              inArray(transactions.statementId, statementIds), // Check if statementId is in the list
              eq(transactions.category, "Suspense"),
              eq(transactions.type, "credit") // Filter by category
            )
          ); // Apply both filters
        return result;
      } catch (error) {
        log.error("Error fetching Suspense Credit transactions:", error);
        throw error;
      }
    }
  );

  ipcMain.handle("get-transactions-by-suspensedebit", async (event, caseId) => {
    try {
      const allStatements = await db
        .select()
        .from(statements)
        .where(eq(statements.caseId, caseId));

      const statementIds = allStatements.map((stmt) => stmt.id.toString());

      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            inArray(transactions.statementId, statementIds), // Check if statementId is in the list
            eq(transactions.category, "Suspense"), // Filter by category
            eq(transactions.type, "debit")
          )
        ); // Apply both filters
      return result;
    } catch (error) {
      log.error("Error fetching Suspense Debit transactions:", error);
      throw error;
    }
  });
  ipcMain.handle("get-transactions-by-emi", async (event, caseId) => {
    // log.info("Handler for 'get-transactions-by-emi' registered.");

    try {
      const allStatements = await db
        .select()
        .from(statements)
        .where(eq(statements.caseId, caseId));

      const statementIds = allStatements.map((stmt) => stmt.id.toString());

      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            inArray(transactions.statementId, statementIds), // Check if statementId is in the list
            eq(transactions.category, "Probable EMI") // Filter by category
          )
        ); // Apply both filters

      return result;
    } catch (error) {
      console.log("Error fetching transactions");
      log.error("Error fetching 'Probable emi' transactions :", error);
      throw error;
    }
  });

  ipcMain.handle("get-transactions-by-investment", async (event, caseId) => {
    // log.info("Handler for 'get-transactions-by-emi' registered.");
    try {
      const allStatements = await db
        .select()
        .from(statements)
        .where(eq(statements.caseId, caseId));

      const statementIds = allStatements.map((stmt) => stmt.id.toString());

      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            inArray(transactions.statementId, statementIds), // Check if statementId is in the list
            eq(transactions.category, "Investment") // Filter by category
          )
        ); // Apply both filters

      return result;
    } catch (error) {
      console.log("Error fetching transactions");
      log.error(
        "Error fetching transactions with category 'Investment':",
        error
      );
      throw error;
    }
  });

  ipcMain.handle("get-transactions-by-reversal", async (event, caseId) => {
    // log.info("Handler for 'get-transactions-by-emi' registered.");

    try {
      const allStatements = await db
        .select()
        .from(statements)
        .where(eq(statements.caseId, caseId));

      const statementIds = allStatements.map((stmt) => stmt.id.toString());

      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            inArray(transactions.statementId, statementIds), // Check if statementId is in the list
            eq(transactions.category, "Refund/Reversal") // Filter by category
          )
        ); // Apply both filters

      return result;
    } catch (error) {
      console.log("Error fetching transactions");
      log.error("Error fetching transactions with category 'Reversal':", error);
      throw error;
    }
  });
}

module.exports = { registerIndividualDashboardIpc };
