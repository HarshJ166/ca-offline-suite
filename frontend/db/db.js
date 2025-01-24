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

// const { createClient } = require("@libsql/client");
// const { schema } = require("./schema");

class DatabaseManager {
  static instance = null;

  static getInstance() {
    if (!DatabaseManager.instance) {
      // log.info("***********\n\n\nDatabasemanager instance is \n\n\n***********", DatabaseManager.instance);
      if (!isDev) {
        // Command to run migration
        const command = `npx drizzle-kit migrate --config ${drizzleConfigPath}`;

        // Execute the command
        exec(command, (error, stdout, stderr) => {
          if (error) {
            log.error(`Error while running migrations: ${error.message}`);
            return;
          }
          if (stderr) {
            log.error(`Migration STDERR: ${stderr}`);
            return;
          }
          log.info(`Migration STDOUT: ${stdout}`);
        });
      }

      const dbUrl = process.env.DB_FILE_NAME;

      console.log('dbUrl', dbUrl);
      if (!dbUrl) {
        throw new Error("DATABASE_URL is not defined in the environment variables.");
      }

      // Initialize libsql client
      // const client = createClient({ url: dbUrl });

      // Create Drizzle ORM instance with the schema
      DatabaseManager.instance = drizzle(dbUrl);
    }
    return DatabaseManager.instance;
  }
}
// 
module.exports = DatabaseManager.getInstance();