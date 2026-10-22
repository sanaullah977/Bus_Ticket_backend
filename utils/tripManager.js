const fs = require("fs");
const path = require("path");
const os = require("os");
const Trip = require("../models/Trip");
const Booking = require("../models/Booking");

/**
 * Get current active trip details
 */
async function getCurrentTrip() {
  // Find the highest completed trip in Trip collection
  const lastCompletedTrip = await Trip.findOne().sort({ tripNumber: -1 });
  const baseTripNumber = lastCompletedTrip ? lastCompletedTrip.tripNumber + 1 : 1;

  // Check if there are existing confirmed bookings with higher tripNumber
  const latestConfirmedBooking = await Booking.findOne({ status: "confirmed" }).sort({
    tripNumber: -1,
  });

  const currentTripNumber = latestConfirmedBooking
    ? Math.max(baseTripNumber, latestConfirmedBooking.tripNumber || 1)
    : baseTripNumber;

  const currentTripId = `Trip-${currentTripNumber}`;

  return {
    tripNumber: currentTripNumber,
    tripId: currentTripId,
  };
}

/**
 * Archive/save the current trip and prepare next trip
 */
async function archiveCurrentTripAndStartNext() {
  const current = await getCurrentTrip();

  // Find all bookings for this trip that are confirmed or active
  const bookings = await Booking.find({
    $or: [
      { tripId: current.tripId, status: "confirmed" },
      { tripNumber: current.tripNumber, status: "confirmed" },
      // Fallback for legacy bookings that don't have tripId yet
      { status: "confirmed", tripId: { $exists: false } },
    ],
  }).sort({ createdAt: 1 });

  const bookedSeats = Array.from(
    new Set(bookings.flatMap((b) => b.selectedSeats || []))
  );

  // If there are no active bookings to archive, avoid creating empty trips
  if (bookings.length === 0) {
    return {
      savedTrip: null,
      nextTrip: current.tripId,
      totalBookingsArchived: 0,
      totalSeatsReset: 0,
      totalRevenue: 0,
      message: `Trip ${current.tripId} has no active bookings to archive. All seats are available for resale.`,
    };
  }

  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

  // 1. Save or update Trip document in MongoDB Trip collection
  const tripData = {
    tripId: current.tripId,
    tripNumber: current.tripNumber,
    busName: bookings[0]?.busName || "P.H Paribahan",
    coach: bookings[0]?.coach || "Coach-009-WEB ! AC_Business",
    route: bookings[0]?.route || "Dhaka - Sylhet",
    departureTime: bookings[0]?.departureTime || "9:00 PM",
    totalSeats: 40,
    totalBookings: bookings.length,
    totalSeatsBooked: bookedSeats.length,
    totalRevenue,
    bookedSeats,
    bookings: bookings.map((b) => b.toObject()),
    status: "completed",
    completedAt: new Date(),
  };

  const savedTrip = await Trip.findOneAndUpdate(
    { tripId: current.tripId },
    tripData,
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  // 2. Create physical folder and files in backend (trips/trip-1/...)
  const folderName = current.tripId.toLowerCase(); // e.g. "trip-1"
  let folderCreatedPath = "";

  const bookingsJsonData = {
    tripId: current.tripId,
    tripNumber: current.tripNumber,
    route: tripData.route,
    completedAt: tripData.completedAt,
    totalSeatsBooked: bookedSeats.length,
    totalRevenue,
    passengers: bookings.map((b) => ({
      bookingId: b._id,
      passengerName: b.passengerName,
      phoneNumber: b.phoneNumber,
      email: b.email,
      seats: b.selectedSeats,
      totalPrice: b.totalPrice,
      couponCode: b.couponCode || "None",
      bookedAt: b.createdAt,
    })),
  };

  const summaryJsonData = {
    tripId: current.tripId,
    status: "completed",
    totalRevenue: `${totalRevenue} BDT`,
    totalSeatsSold: bookedSeats.length,
    availableSeatsForNextTrip: 40,
    archivedAt: new Date().toISOString(),
  };

  try {
    const tripsBaseDir = path.join(__dirname, "../trips");
    const tripFolder = path.join(tripsBaseDir, folderName);

    if (!fs.existsSync(tripFolder)) {
      fs.mkdirSync(tripFolder, { recursive: true });
    }

    fs.writeFileSync(
      path.join(tripFolder, "bookings.json"),
      JSON.stringify(bookingsJsonData, null, 2),
      "utf-8"
    );

    fs.writeFileSync(
      path.join(tripFolder, "summary.json"),
      JSON.stringify(summaryJsonData, null, 2),
      "utf-8"
    );

    folderCreatedPath = `trips/${folderName}`;
  } catch (fsErr) {
    console.warn("[TripManager Local Dir write fallback]:", fsErr.message);
    try {
      const tmpBase = path.join(os.tmpdir(), "busticket_trips");
      const tmpFolder = path.join(tmpBase, folderName);
      if (!fs.existsSync(tmpFolder)) {
        fs.mkdirSync(tmpFolder, { recursive: true });
      }
      fs.writeFileSync(
        path.join(tmpFolder, "bookings.json"),
        JSON.stringify(bookingsJsonData, null, 2),
        "utf-8"
      );
      fs.writeFileSync(
        path.join(tmpFolder, "summary.json"),
        JSON.stringify(summaryJsonData, null, 2),
        "utf-8"
      );
      folderCreatedPath = tmpFolder;
    } catch (tmpErr) {
      console.warn("[TripManager TMP write warning]:", tmpErr.message);
    }
  }

  // 3. Mark all bookings of this trip as "completed" so active seats become available (0 booked seats)
  await Booking.updateMany(
    {
      $or: [
        { tripId: current.tripId },
        { tripNumber: current.tripNumber },
        { status: "confirmed", tripId: { $exists: false } },
      ],
      status: "confirmed",
    },
    {
      $set: {
        status: "completed",
        tripId: current.tripId,
        tripNumber: current.tripNumber,
      },
    }
  );

  const nextTripNumber = current.tripNumber + 1;
  const nextTripId = `Trip-${nextTripNumber}`;

  return {
    savedTrip: current.tripId,
    nextTrip: nextTripId,
    totalBookingsArchived: bookings.length,
    totalSeatsReset: bookedSeats.length,
    totalRevenue,
    folderCreated: folderCreatedPath || `trips/${folderName}`,
    archivedAt: tripData.completedAt,
  };
}

module.exports = {
  getCurrentTrip,
  archiveCurrentTripAndStartNext,
};
