const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    const options = {
      dbName: process.env.MONGODB_DB_NAME || "busticket",
      serverSelectionTimeoutMS: 5000,
    };

    const conn = await mongoose.connect(uri, options);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
    // Don't crash immediately so API can report status, but log clearly
    return null;
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("[Database] MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("[Database] MongoDB reconnected");
});

module.exports = connectDB;
