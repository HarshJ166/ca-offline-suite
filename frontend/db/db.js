const log = require("electron-log");
const path = require("path");
const { exec } = require("child_process");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const isDev = process.env.NODE_ENV === "development";
log.info('process.env.NODE_ENV', process.env.NODE_ENV);
const BASE_DIR = isDev ? __dirname : process.resourcesPath;
const drizzleConfigPath = path.resolve(__dirname, "../drizzle.config.js");
log.info('drizzleConfigPath', drizzleConfigPath);


log.info('DB process.env.DB_FILE_NAME', process.env.DB_FILE_NAME);
const { drizzle } = require("drizzle-orm/libsql");
const { migrate } = require("drizzle-orm/libsql/migrator");

// const { createClient } = require("@libsql/client");
// const { schema } = require("./schema");

class DatabaseManager {
  static instance = null;

  static getInstance() {
    if (!DatabaseManager.instance) {
      // log.info("***********\n\n\nDatabasemanager instance is \n\n\n***********", DatabaseManager.instance);
      if (!isDev) {

      }

      // const dbUrl = process.env.DB_FILE_NAME;
      const dbUrl = `file:${isDev
        ? path.resolve(__dirname, "../db.sqlite3")
        : path.join(BASE_DIR, "db.sqlite3")}`; // For production builds
      log.info("Resolved dbUrl:", dbUrl);

      console.log('dbUrl : ', dbUrl);
      if (!dbUrl) {
        throw new Error("DATABASE_URL is not defined in the environment variables.");
      }

      // Initialize libsql client
      // const client = createClient({ url: dbUrl });

      // Create Drizzle ORM instance with the schema
      const db = drizzle(dbUrl);
      DatabaseManager.instance = db;
      const migrationsFolder = path.resolve(__dirname, "../drizzle");
      log.info('migrationsFolder : ', migrationsFolder);

      migrate(db, {
        migrationsFolder: migrationsFolder, // Ensure this path points to your migrations folder
      })
        .then(() => {
          log.info("Migrations completed successfully.");
        })
        .catch((error) => {
          log.error("Error running migrations:", error);
          throw error;
        });
    }
    return DatabaseManager.instance;
  }
}
// 
module.exports = DatabaseManager.getInstance();