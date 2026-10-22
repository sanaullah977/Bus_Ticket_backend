const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    couponCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    percentageOff: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    date: {
      type: String,
      default: "December 2026",
    },
    backGroundColor: {
      type: String,
      default: "#FFBF0F",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

couponSchema.index({ isActive: 1 });

module.exports = mongoose.model("Coupon", couponSchema);
