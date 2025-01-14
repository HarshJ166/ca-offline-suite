const { sqliteTable, text, real } = require("drizzle-orm/sqlite-core");
const { cases } = require("./Cases");

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey().notNull(),
  caseId: text("case_id")
  .notNull()
  .references(() => cases.id, { onDelete: "CASCADE" }),
  date: text("date").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(),
});
