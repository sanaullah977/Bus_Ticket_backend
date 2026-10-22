const express = require("express");
const router = express.Router();
const Trip = require("../models/Trip");
const { getCurrentTrip } = require("../utils/tripManager");

// GET /api/trips - list all archived trips
router.get("/", async (req, res) => {
  try {
    const trips = await Trip.find().sort({ tripNumber: -1 }).lean();
    return res.json({ success: true, count: trips.length, trips });
  } catch (error) {
    console.error("[Get Trips Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/trips/current - get current active trip status
router.get("/current", async (req, res) => {
  try {
    const current = await getCurrentTrip();
    return res.json({ success: true, ...current });
  } catch (error) {
    console.error("[Get Current Trip Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/trips/:tripId - get specific trip details by tripId (e.g. Trip-1)
router.get("/:tripId", async (req, res) => {
  try {
    const trip = await Trip.findOne({
      tripId: new RegExp(`^${req.params.tripId}$`, "i"),
    }).lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: `Trip '${req.params.tripId}' not found`,
      });
    }

    return res.json({ success: true, trip });
  } catch (error) {
    console.error("[Get Trip By ID Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
