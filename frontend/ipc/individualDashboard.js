const { ipcMain } = require("electron");
const log = require("electron-log");
const db = require("../db/db");
const { statements } = require("../db/schema/Statement");
const { transactions } = require("../db/schema/Transactions");
const { eq, and } = require("drizzle-orm"); // Add this import

function registerIndividualDashboardIpc() {
  ipcMain.handle("get-transactions", async (event, caseId) => {
    try {
      // Get all statements for the case
      const allStatements = await db
        .select()
        .from(statements)
        .where(eq(statements.caseId, caseId));

      // Get all transactions for these statements
      const allTransactions = await db
        .select()
        .from(transactions)
        .where(
          inArray(
            transactions.statementId,
            allStatements.map((stmt) => stmt.id)
          )
        );
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

      const statementIds = allStatements.map((stmt) => stmt.id);

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

  ipcMain.handle("get-transactions-by-creditor", async (event, statementId) => {
    try {
      const allStatements = await db
        .select()
        .from(statements)
        .where(eq(statements.caseId, caseId));

      const statementIds = allStatements.map((stmt) => stmt.id);

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

        const statementIds = allStatements.map((stmt) => stmt.id);

        const result = await db
          .select()
          .from(transactions)
          .where(
            and(
              inArray(transactions.statementId, statementIds), // Check if statementId is in the list
              eq(transactions.category, "Cash withdrawal") // Filter by category
            )
          ); // Apply both filters

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

      const statementIds = allStatements.map((stmt) => stmt.id);

      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            inArray(transactions.statementId, statementIds), // Check if statementId is in the list
            eq(transactions.category, "Cash deposits") // Filter by category
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

        const statementIds = allStatements.map((stmt) => stmt.id);

        const result = await db
          .select()
          .from(transactions)
          .where(
            and(
              inArray(transactions.statementId, statementIds), // Check if statementId is in the list
              eq(transactions.category, "Suspense"),
              eq(transactions.type, "Credit") // Filter by category
            )
          ); // Apply both filters
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

      const statementIds = allStatements.map((stmt) => stmt.id);

      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            inArray(transactions.statementId, statementIds), // Check if statementId is in the list
            eq(transactions.category, "Suspense"), // Filter by category
            eq(transactions.type, "Debit")
          )
        ); // Apply both filters
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

      const statementIds = allStatements.map((stmt) => stmt.id);

      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            inArray(transactions.statementId, statementIds), // Check if statementId is in the list
            eq(transactions.category, "Probable emi") // Filter by category
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

      const statementIds = allStatements.map((stmt) => stmt.id);

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

      const statementIds = allStatements.map((stmt) => stmt.id);

      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            inArray(transactions.statementId, statementIds), // Check if statementId is in the list
            eq(transactions.category, "Refund/reversal") // Filter by category
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
