const { sqliteTable, text } = require("drizzle-orm/sqlite-core");
const { transactions } = require("./Transactions");

export const finance_vouchers = sqliteTable("finance_vouchers", {
    id: text("id").primaryKey().notNull(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "CASCADE" }),
    cr_ledger: text("cr_ledger").notNull(),
    dr_ledger: text("dr_ledger").notNull(),
    effective_date: text("effective_date").notNull(),
  });
  