require("dotenv").config();
const { drizzle } = require("drizzle-orm/libsql");
// const { createClient } = require("@libsql/client");
// const { schema } = require("./schema");

class DatabaseManager {
  static #instance = null;

  static getInstance() {
    if (!DatabaseManager.#instance) {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error("DATABASE_URL is not defined in the environment variables.");
      }

      // Initialize libsql client
      const client = createClient({ url: dbUrl });

      // Create Drizzle ORM instance with the schema
      DatabaseManager.#instance = drizzle(dbUrl);
    }
    return DatabaseManager.#instance;
  }
}
// 
module.exports = DatabaseManager.getInstance();
