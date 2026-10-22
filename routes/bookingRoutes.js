const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const {
  getCurrentTrip,
  archiveCurrentTripAndStartNext,
} = require("../utils/tripManager");

// POST /api/bookings/reset - archive current trip to Trip database & folder, mark bookings completed, reset seats for resale
router.post("/reset", async (req, res) => {
  try {
    const result = await archiveCurrentTripAndStartNext();
    const message = result.savedTrip
      ? `Trip ${result.savedTrip} archived successfully! Resale seats ready for ${result.nextTrip}. Previous data is 100% preserved.`
      : result.message || "All seats are already available for booking.";

    return res.json({
      success: true,
      message,
      ...result,
    });
  } catch (error) {
    console.error("[Reset Bookings Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/current-trip - get active trip metadata
router.get("/current-trip", async (req, res) => {
  try {
    const current = await getCurrentTrip();
    return res.json({ success: true, ...current });
  } catch (error) {
    console.error("[Get Current Trip Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings/booked-seats - list currently active booked seats for the active trip
router.get("/booked-seats", async (req, res) => {
  try {
    const bookings = await Booking.find(
      { status: "confirmed" },
      "selectedSeats"
    ).lean();
    const bookedSeats = bookings.flatMap((b) => b.selectedSeats || []);
    const uniqueBookedSeats = Array.from(new Set(bookedSeats));
    return res.json({ success: true, bookedSeats: uniqueBookedSeats });
  } catch (error) {
    console.error("[Get Booked Seats Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/bookings - list all bookings (supports ?tripId=Trip-1 filter)
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.tripId) {
      filter.tripId = req.query.tripId;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).lean();
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

// POST /api/bookings - create a new booking in the current active trip
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

    // Check if any seat is already booked for active trip
    const existing = await Booking.find({
      status: "confirmed",
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

    // Get current active trip
    const currentTrip = await getCurrentTrip();

    const pricePerSeat = Number(seatPrice) || 550;
    const computedTotal = (selectedSeats.length || 0) * pricePerSeat;
    const finalTotalPrice =
      totalPrice !== undefined && totalPrice !== null
        ? Number(totalPrice)
        : Math.max(0, computedTotal - (Number(discount) || 0));

    const newBooking = new Booking({
      tripId: currentTrip.tripId,
      tripNumber: currentTrip.tripNumber,
      passengerName: passengerName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email ? email.trim() : "",
      selectedSeats,
      seatPrice: pricePerSeat,
      discount: Number(discount) || 0,
      totalPrice: finalTotalPrice,
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
      tripId: currentTrip.tripId,
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
