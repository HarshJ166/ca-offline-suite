const { sqliteTable, text } = require("drizzle-orm/sqlite-core");
const { transactions } = require("./Transactions");

export const trade_vouchers = sqliteTable("trade_vouchers", {
    id: text("id").primaryKey().notNull(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "CASCADE" }),
    sales_ledger: text("sales_ledger").notNull(),
    purchase_ledger: text("purchase_ledger").notNull(),
    effective_date: text("effective_date").notNull(),
  });
  