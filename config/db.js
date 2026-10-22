const mongoose = require("mongoose");

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("[Database Error] MONGODB_URI is not defined in environment variables");
    return null;
  }

  if (!cached.promise) {
    const options = {
      dbName: process.env.MONGODB_DB_NAME || "busticket",
      serverSelectionTimeoutMS: 8000,
      bufferCommands: false, // Don't buffer commands indefinitely
    };

    cached.promise = mongoose
      .connect(uri, options)
      .then((m) => {
        console.log(`[Database] MongoDB Connected: ${m.connection.host} (DB: ${m.connection.name})`);
        return m;
      })
      .catch((err) => {
        console.error(`[Database Error] ${err.message}`);
        cached.promise = null;
        return null;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

mongoose.connection.on("disconnected", () => {
  console.warn("[Database] MongoDB disconnected");
});

module.exports = connectDB;
