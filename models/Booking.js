const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    passengerName: {
      type: String,
      required: [true, "Passenger name is required"],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    selectedSeats: {
      type: [String],
      required: [true, "At least one seat must be selected"],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0 && v.length <= 4;
        },
        message: "You can select between 1 and 4 seats",
      },
    },
    seatPrice: {
      type: Number,
      default: 550,
    },
    discount: {
      type: Number,
      default: 0,
    },
    totalPrice: {
      type: Number,
      required: [true, "Total price is required"],
    },
    couponCode: {
      type: String,
      default: "",
      trim: true,
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
    status: {
      type: String,
      enum: ["confirmed", "pending", "cancelled", "completed"],
      default: "confirmed",
    },
    tripId: {
      type: String,
      default: "Trip-1",
      trim: true,
    },
    tripNumber: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Performance indexes for ultra-fast query execution & seat availability checks
bookingSchema.index({ status: 1 });
bookingSchema.index({ tripId: 1, status: 1 });
bookingSchema.index({ tripNumber: -1 });
bookingSchema.index({ selectedSeats: 1, status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
