const { ipcMain } = require("electron");
const log = require("electron-log");
const db = require("../db/db");
const { opportunityToEarn } = require("../db/schema/OpportunityToEarn");
const { eq, and, inArray } = require("drizzle-orm"); // Add this import

ipcMain.handle("get-opportunity-to-earn", async (event, caseId) => {
  const result = await db
    .select()
    .from(opportunityToEarn)
    .where(eq(opportunityToEarn.caseId, caseId));

  console.log("Opportunity to Earn fetched successfully:", result);
  return result;
});
