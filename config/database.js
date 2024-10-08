const mongoose = require("mongoose");

const DBConnection = () => {
  mongoose.connect(process.env.DATABASE_URI).then(() => {
    console.log("connected to database");
  });
};

module.exports = DBConnection;
