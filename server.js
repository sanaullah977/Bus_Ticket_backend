require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const bookingRoutes = require("./routes/bookingRoutes");
const couponRoutes = require("./routes/couponRoutes");
const busRoutes = require("./routes/busRoutes");
const tripRoutes = require("./routes/tripRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure DB is connected for every request (essential for serverless/Vercel)
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (e) {
      console.error("[DB Middleware Error]:", e.message);
    }
  }
  next();
});

// Request logging in development
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Root & Health Check Routes
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Bus Ticket Booking API is active and ready!",
    version: "1.0.0",
    endpoints: {
      bus: "/api/bus",
      bookings: "/api/bookings",
      bookedSeats: "/api/bookings/booked-seats",
      trips: "/api/trips",
      currentTrip: "/api/trips/current",
      coupons: "/api/coupons",
      applyCoupon: "POST /api/coupons/apply",
      health: "/api/health",
    },
  });
});

app.get("/api/health", (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isConnected ? "ok" : "disconnected",
    database: isConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/bookings", bookingRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/bus", busRoutes);
app.use("/api/trips", tripRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("[Server Error]:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Start Server (only if not already running under serverless wrapper)
if (process.env.NODE_ENV !== "test") {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Bus Ticket Backend running at http://localhost:${PORT}`);
  });

  process.on("SIGINT", () => {
    console.log("[Server] Shutting down gracefully...");
    server.close(() => {
      console.log("[Server] Closed HTTP connections.");
      process.exit(0);
    });
  });
}

module.exports = app;
