// src/db/schema.js
const { sqliteTable, text, integer } = require("drizzle-orm/sqlite-core");

// Users table
const users = sqliteTable("users", {
  id: integer("id").primaryKey().autoincrement(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  createdAt: integer("created_at").notNull(),
});

module.exports = {
  schema: { users },
};
