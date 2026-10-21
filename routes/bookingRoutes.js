const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

// GET /api/bookings/booked-seats - list all currently reserved/booked seat identifiers
router.get("/booked-seats", async (req, res) => {
  try {
    const bookings = await Booking.find(
      { status: { $ne: "cancelled" } },
      "selectedSeats"
    );
    const bookedSeats = bookings.flatMap((b) => b.selectedSeats || []);
    const uniqueBookedSeats = Array.from(new Set(bookedSeats));
    return res.json({ success: true, bookedSeats: uniqueBookedSeats });
  } catch (error) {
    console.error("[Get Booked Seats Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings - list all bookings
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    return res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    console.error("[Get Bookings Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/:id - get single booking by ID
router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    return res.json({ success: true, booking });
  } catch (error) {
    console.error("[Get Booking By ID Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/bookings - create a new booking
router.post("/", async (req, res) => {
  try {
    const {
      passengerName,
      phoneNumber,
      email,
      selectedSeats,
      seatPrice,
      discount,
      totalPrice,
      couponCode,
      busName,
      coach,
      route,
      departureTime,
    } = req.body;

    if (!passengerName || !passengerName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Passenger name is required",
      });
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one seat",
      });
    }

    if (selectedSeats.length > 4) {
      return res.status(400).json({
        success: false,
        message: "You cannot select more than 4 seats",
      });
    }

    // Check if any seat is already booked
    const existing = await Booking.find({
      status: { $ne: "cancelled" },
      selectedSeats: { $in: selectedSeats },
    });

    if (existing.length > 0) {
      const alreadyBooked = existing.flatMap((b) => b.selectedSeats).filter((s) => selectedSeats.includes(s));
      return res.status(409).json({
        success: false,
        message: `Seat(s) already booked: ${[...new Set(alreadyBooked)].join(", ")}`,
        alreadyBooked: [...new Set(alreadyBooked)],
      });
    }

    const newBooking = new Booking({
      passengerName: passengerName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email ? email.trim() : "",
      selectedSeats,
      seatPrice: seatPrice || 550,
      discount: discount || 0,
      totalPrice: totalPrice,
      couponCode: couponCode || "",
      busName: busName || "P.H Paribahan",
      coach: coach || "Coach-009-WEB ! AC_Business",
      route: route || "Dhaka - Sylhet",
      departureTime: departureTime || "9:00 PM",
      status: "confirmed",
    });

    const saved = await newBooking.save();

    return res.status(201).json({
      success: true,
      message: "Ticket booked successfully!",
      booking: saved,
    });
  } catch (error) {
    console.error("[Create Booking Error]:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create booking",
    });
  }
});

module.exports = router;
