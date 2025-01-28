const { ipcMain } = require("electron");
const log = require("electron-log");
const db = require("../db/db");
const { opportunityToEarn } = require("../db/schema/OpportunityToEarn");
const { eq, and, inArray } = require("drizzle-orm"); // Add this import

function registerOpportunityToEarnIpc() {
  ipcMain.handle("getOpportunityToEarn", async (event, caseId) => {
    try {
      const opportunityToEarnData = await db
        .select()
        .from(opportunityToEarn)
        .where(eq(opportunityToEarn.caseId, caseId));
      return opportunityToEarnData;
    } catch (error) {
      log.error(error);
      return [];
    }
  });
}

module.exports = { registerOpportunityToEarnIpc };
