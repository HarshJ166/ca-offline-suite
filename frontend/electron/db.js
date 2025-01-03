const { Sequelize, DataTypes } = require('sequelize');
const dbConfig = require('./config/dbConfig');  // Import your configuration file
// const UserModel = require('./schema/User'); // Import User model

class Database {
  // Static property to hold the single instance
  static instance = null;

  // Constructor is now private, so it cannot be instantiated directly
  constructor() {
    if (Database.instance) {
      return Database.instance;  // Return the existing instance if it already exists
    }

    // Create the Sequelize instance
    this.sequelize = new Sequelize({
      dialect: dbConfig.dialect,  // SQLite dialect
      storage: dbConfig.storage,  // Path to SQLite database file
      logging: dbConfig.logging,  // Disable or enable logging based on config
    });

    // this.User = UserModel(this.sequelize);

    // Set the singleton instance
    Database.instance = this;

    this.initialize();
  }

  // Initialize the database connection
  async initialize() {
    try {
      // Authenticate Sequelize connection
      await this.sequelize.authenticate();
      console.log('Database connection established successfully.');

      // Sync models with database
      await this.sequelize.sync({ force: false }); // Set to 'true' for development to drop and recreate tables
      console.log('Models have been synchronized with the database.');

      // Optionally, create a test user or any other setup actions
    //   await this.User.create({ name: 'John Doe', email: 'john.doe@example.com' });

    //   // Log the users (optional)
    //   const users = await this.User.findAll();
    //   console.log('Users:', users);
    } catch (error) {
      console.error('Database connection failed:', error);
    }
  }

  // Static method to get the singleton instance
  static getInstance() {
    if (!Database.instance) {
      Database.instance = new Database();
      console.log("DB created")
    }
    else{
        console.log("Db Instance already present");
    }
    return Database.instance.sequelize;
  }
}

// Exporting the Singleton instance via the static method
module.exports = Database.getInstance();
