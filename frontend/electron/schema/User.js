// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');
if (sequelize) {
    console.log("Sequelize present");
}
else{
    console.log("Sequelize not present");
}

const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'users',
    timestamps: true,
  });

module.exports = User;