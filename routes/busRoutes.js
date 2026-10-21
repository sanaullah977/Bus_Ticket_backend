const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

// GET /api/bus - get bus schedule and availability
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find(
      { status: { $ne: "cancelled" } },
      "selectedSeats"
    );
    const bookedSeats = Array.from(
      new Set(bookings.flatMap((b) => b.selectedSeats || []))
    );

    const busInfo = {
      name: "P.H Paribahan",
      company: "P Paribahan",
      coach: "Coach-009-WEB ! AC_Business",
      route: "Dhaka - Sylhet",
      departureTime: "9:00 PM",
      seatPrice: 550,
      totalSeats: 40,
      bookedSeats,
      seatsLeft: Math.max(0, 40 - bookedSeats.length),
      busPoints: [
        "Boarding Point - Laxmipur",
        "Dropping Point - Bogura",
        "Est. Time - 11 Hour",
      ],
    };

    return res.json({ success: true, bus: busInfo });
  } catch (error) {
    console.error("[Get Bus Info Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
