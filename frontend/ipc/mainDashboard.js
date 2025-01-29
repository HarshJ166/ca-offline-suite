const { ipcMain } = require("electron");
const log = require("electron-log");
const db = require("../db/db");
const { statements } = require("../db/schema/Statement");
const { cases } = require("../db/schema/Cases");
const { count } = require("drizzle-orm");

function registerMainDashboardIpc() {
  
  ipcMain.handle("get-reports-processed", async (event) => {
    try {
      const totalCount = await db
        .select({ count: count() })
        .from(cases)
        .then((rows) => rows[0]?.count || 0);

      const caseDates = await db
        .select({ createdAt: cases.createdAt })
        .from(cases);

      const statusCounts = await db
        .select({
          status: cases.status,
          count: count()
        })
        .from(cases)
        .groupBy(cases.status);

      // console.log("count", totalCount);
      // console.log("caseDates", caseDates);
      console.log("statusCounts", statusCounts);

      const successCount = statusCounts.find(row => row.status === 'Success')?.count || 0;
      const failedCount = statusCounts.find(row => row.status === 'Failed')?.count || 0;

      return {
        totalCount,
        caseDates: caseDates.map((row) => row.createdAt),
        statusCounts: {
          success: successCount,
          failed: failedCount
        }
      };
    } catch (error) {
      log.error("Error fetching cases processed:", error);
      throw error;
    }
  });

  ipcMain.handle("get-statements-processed", async (event) => {
    try {
      const totalCount = await db
        .select({ count: count() })
        .from(statements)
        .then((rows) => rows[0]?.count || 0);

      const statementDates = await db
        .select({ createdAt: statements.createdAt })
        .from(statements);
    
      // console.log("count", totalCount);
      // console.log("statementDates", statementDates);

      return {
        totalCount,
        statementDates: statementDates.map((row) => row.createdAt),
      };

    } catch (error) {
      log.error("Error fetching statements processed:", error);
      throw error;
    }
  });

}

module.exports = { registerMainDashboardIpc };

