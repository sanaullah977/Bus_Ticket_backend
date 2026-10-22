const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");

const defaultCoupons = [
  { percentageOff: 15, date: "January 2026", couponCode: "NEW15", backGroundColor: "#FFBF0F" },
  { percentageOff: 20, date: "January 2026", couponCode: "COUPLE20", backGroundColor: "#F6949F" },
  { percentageOff: 10, date: "February 2026", couponCode: "SAVE10", backGroundColor: "#4ADE80" },
  { percentageOff: 25, date: "March 2026", couponCode: "SUPER25", backGroundColor: "#60A5FA" },
  { percentageOff: 30, date: "April 2026", couponCode: "MEGA30", backGroundColor: "#A78BFA" },
  { percentageOff: 50, date: "May 2026", couponCode: "HALF50", backGroundColor: "#FB923C" },
  { percentageOff: 5, date: "June 2026", couponCode: "WELCOME5", backGroundColor: "#38BDF8" },
  { percentageOff: 40, date: "July 2026", couponCode: "PROMO40", backGroundColor: "#F472B6" },
];

// Helper to seed defaults if DB is empty (cached in-memory for high performance)
let isCouponsSeeded = false;
const ensureSeedCoupons = async () => {
  if (isCouponsSeeded) return;
  try {
    const count = await Coupon.countDocuments();
    if (count === 0) {
      await Coupon.insertMany(defaultCoupons);
      console.log("[Coupons] Seeded default coupons into database");
    }
    isCouponsSeeded = true;
  } catch (err) {
    console.error("[Coupons Seed Error]:", err.message);
  }
};

// GET /api/coupons
router.get("/", async (req, res) => {
  try {
    await ensureSeedCoupons();
    const coupons = await Coupon.find({ isActive: true }).lean();
    return res.json({ success: true, count: coupons.length, coupons });
  } catch (error) {
    console.error("[Get Coupons Error]:", error);
    // Graceful fallback to default coupons
    return res.json({ success: true, count: defaultCoupons.length, coupons: defaultCoupons });
  }
});

// POST /api/coupons/apply
router.post("/apply", async (req, res) => {
  try {
    const { code, totalPrice } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, "");

    await ensureSeedCoupons();
    // Search by uppercase and remove spaces for matching (e.g. "Couple 20" vs "COUPLE20")
    const allCoupons = await Coupon.find({ isActive: true }).lean();
    const coupon = allCoupons.find(
      (c) => c.couponCode.replace(/\s+/g, "").toUpperCase() === normalizedCode
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired coupon code",
      });
    }

    const price = Number(totalPrice) || 0;
    const discountAmount = Math.round((price * coupon.percentageOff) / 100);
    const grandTotal = Math.max(0, price - discountAmount);

    return res.json({
      success: true,
      message: `Coupon applied! You saved ${coupon.percentageOff}% (BDT ${discountAmount})`,
      couponCode: coupon.couponCode,
      percentageOff: coupon.percentageOff,
      discountAmount,
      grandTotal,
    });
  } catch (error) {
    console.error("[Apply Coupon Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
