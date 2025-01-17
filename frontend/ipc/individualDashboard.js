const { ipcMain } = require("electron");
const log = require("electron-log");
const db = require("../db/db");
const { transactions } = require("../db/schema/Transactions");
const { eq, and } = require("drizzle-orm"); // Add this import

function registerIndividualDashboardIpc() {
  ipcMain.handle("get-transactions", async () => {
    try {
      const result = await db.select().from(transactions);
      log.info("Transactions fetched successfully:", result.length);
      return result;
    } catch (error) {
      log.error("Error fetching transactions:", error);
      throw error;
    }
  });

  ipcMain.handle("get-transactions-by-debtor", async () => {
    try {
      const result = await db
        .select()
        .from(transactions)
        .where(eq(transactions.category, "Debtor")); // Add the WHERE clause here
      log.info(
        "Transactions with category 'Debtors' fetched successfully:",
        result.length
      );
      console.log("debtors", result);
      return result;
    } catch (error) {
      log.error("Error fetching transactions with category 'debtor':", error);
      throw error;
    }
  });

  ipcMain.handle("get-transactions-by-creditor", async () => {
    try {
      const result = await db
        .select()
        .from(transactions)
        .where(eq(transactions.category, "Creditor")); // Add the WHERE clause here
      log.info(
        "Transactions with category 'Creditors' fetched successfully:",
        result.length
      );
      console.log("Creditor", result);
      return result;
    } catch (error) {
      log.error("Error fetching transactions with category 'creditor':", error);
      throw error;
    }
  });

  ipcMain.handle("get-transactions-by-cashwithdrawal", async () => {
    try {
      const result = await db
        .select()
        .from(transactions)
        .where(eq(transactions.category, "Cash withdrawal")); // Add the WHERE clause here
      log.info(
        "Transactions with category 'Cash withdrawal' fetched successfully:",
        result.length
      );
      console.log("Cash withdrawal", result);
      return result;
    } catch (error) {
      log.error(
        "Error fetching transactions with category 'Cash withdrawal':",
        error
      );
      throw error;
    }
  });

  ipcMain.handle("get-transactions-by-cashdeposit", async () => {
    try {
      const result = await db
        .select()
        .from(transactions)
        .where(eq(transactions.category, "Cash deposits")); // Add the WHERE clause here
      log.info(
        "Transactions with category 'Cash deposits' fetched successfully:",
        result.length
      );
      console.log("Cash deposits", result);
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
  ipcMain.handle("get-transactions-by-suspensecredit", async () => {
    try {
      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.category, "Suspense"),
            eq(transactions.type, "Credit")
          )
        );

      log.info(
        "Suspense Credit transactions fetched successfully:",
        result.length
      );
      console.log("suspense credits:", result);
      return result;
    } catch (error) {
      log.error("Error fetching Suspense Credit transactions:", error);
      throw error;
    }
  });

  ipcMain.handle("get-transactions-by-suspensedebit", async () => {
    try {
      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.category, "Suspense"),
            eq(transactions.type, "Debit")
          )
        );

      log.info(
        "Suspense Debit transactions fetched successfully:",
        result.length
      );
      console.log("suspense debits:", result);
      return result;
    } catch (error) {
      log.error("Error fetching Suspense Debit transactions:", error);
      throw error;
    }
  });
  ipcMain.handle("get-transactions-by-emi", async () => {
    // log.info("Handler for 'get-transactions-by-emi' registered.");
    try {
      const result = await db
        .select()
        .from(transactions)
        .where(eq(transactions.category, "Probable emi")); // Add the WHERE clause here
      log.info(" 'Probable emi' transactions fetched successfully:", result);
      console.log("emi transactions:", result);
      return result;
    } catch (error) {
      console.log("Error fetching transactions");
      log.error("Error fetching 'Probable emi' transactions :", error);
      throw error;
    }
  });

  ipcMain.handle("get-transactions-by-investment", async () => {
    // log.info("Handler for 'get-transactions-by-emi' registered.");
    try {
      const result = await db
        .select()
        .from(transactions)
        .where(eq(transactions.category, "Investment")); // Add the WHERE clause here
      log.info(
        "Transactions with category 'Investment' fetched successfully:",
        result
      );
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

  ipcMain.handle("get-transactions-by-reversal", async () => {
    // log.info("Handler for 'get-transactions-by-emi' registered.");
    try {
      const result = await db
        .select()
        .from(transactions)
        .where(eq(transactions.category, "Refund/reversal")); // Add the WHERE clause here
      log.info(
        "Transactions with category 'Reversal' fetched successfully:",
        result.length
      );
      return result;
    } catch (error) {
      console.log("Error fetching transactions");
      log.error("Error fetching transactions with category 'Reversal':", error);
      throw error;
    }
  });
}

module.exports = { registerIndividualDashboardIpc };
