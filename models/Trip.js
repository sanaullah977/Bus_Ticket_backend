const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    tripId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    }, // e.g. "Trip-1", "Trip-2"
    tripNumber: {
      type: Number,
      required: true,
    },
    busName: {
      type: String,
      default: "P.H Paribahan",
    },
    coach: {
      type: String,
      default: "Coach-009-WEB ! AC_Business",
    },
    route: {
      type: String,
      default: "Dhaka - Sylhet",
    },
    departureTime: {
      type: String,
      default: "9:00 PM",
    },
    totalSeats: {
      type: Number,
      default: 40,
    },
    totalBookings: {
      type: Number,
      default: 0,
    },
    totalSeatsBooked: {
      type: Number,
      default: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
    },
    bookedSeats: {
      type: [String],
      default: [],
    },
    bookings: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "completed",
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Performance index for rapid trip sorting and active trip resolution
tripSchema.index({ tripNumber: -1 });

module.exports = mongoose.model("Trip", tripSchema);
