import mongoose, { Types } from "mongoose";
import config from "../config";
import { User } from "../app/modules/user/user.model";
import { Driver } from "../app/modules/driver/driver.model";
import { Car } from "../app/modules/car/car.model";
import { ServiceArea } from "../app/modules/serviceArea/serviceArea.model";
import { RideCategory } from "../app/modules/rideCategory/rideCategory.model";
import { Ride } from "../app/modules/ride/ride.model";
import { Event } from "../app/modules/event/event.model";
import { Tracking } from "../app/modules/tracking/tracking.model";
import { ReservationServices } from "../app/modules/reservation/reservation.service";
import { RIDE_TYPE, RIDE_STATUS } from "../app/modules/ride/ride.constant";
import { DRIVER_STATUS, STATUS, USER_ROLES } from "../enums/user";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`PASS: ${message}`);
};

async function run() {
  try {
    console.log("Connecting to Database:", config.database_url);
    await mongoose.connect(config.database_url as string);
    console.log("Database connected successfully.");

    // Clean up
    console.log("Cleaning old test data...");
    await User.deleteMany({
      email: { $in: ["testpassenger@alygo.com", "testdriver@alygo.com"] },
    });
    await ServiceArea.deleteMany({ city: "Test Reservations City" });
    await RideCategory.deleteMany({ name: "Test Comfort" });
    await Event.deleteMany({ eventName: "Test Event" });
    await Ride.deleteMany({ "rideCategory.name": "Test Comfort" });

    // Setup entities
    console.log("Setting up Test Entities...");
    const passenger = await User.create({
      name: "Test Passenger",
      email: "testpassenger@alygo.com",
      phone: "+12222222222",
      countryCode: "+1",
      role: USER_ROLES.USER,
      status: STATUS.ACTIVE,
      verified: true,
    });

    const driverUser = await User.create({
      name: "Test Driver",
      email: "testdriver@alygo.com",
      phone: "+13333333333",
      countryCode: "+1",
      role: USER_ROLES.DRIVER,
      status: STATUS.ACTIVE,
      verified: true,
    });

    const driver = await Driver.create({
      userId: driverUser._id,
      driverAvailabilityStatus: "online",
      approvalStatus: DRIVER_STATUS.APPROVED,
      availability: { canReceiveRide: true },
    });

    const carId = new Types.ObjectId();
    await Car.collection.insertOne({
      _id: carId,
      driverId: driver._id,
      brand: "Honda",
      model: "Civic",
      year: 2021,
      carType: "sedan",
      seatNumber: 4,
      licensePlate: "RESERVE1",
      vehicleId: new Types.ObjectId().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const car = { _id: carId };

    const cityServiceArea = await ServiceArea.create({
      city: "Test Reservations City",
      type: "city",
      status: "active",
      timezone: "UTC",
    });

    const airportServiceArea = await ServiceArea.create({
      city: "Test Reservations City",
      type: "airport",
      status: "active",
      timezone: "UTC",
    });

    const testComfort = await RideCategory.create({
      name: "Test Comfort",
      status: "active",
      commissionRate: 10,
      minimumDriverRating: 1,
      vehicleRequirements: { vehicleTypes: ["sedan"], minimumSeats: 4 },
    });

    const activeEvent = await Event.create({
      eventName: "Test Event",
      description: "Reservation testing event",
      timezone: "UTC",
      startDateTime: new Date(Date.now() - 1000 * 60 * 60), // started 1h ago
      endDateTime: new Date(Date.now() + 1000 * 60 * 60), // ends in 1h
      serviceAreaId: cityServiceArea._id,
      location: { type: "Point", coordinates: [90.5, 23.5] },
      status: STATUS.ACTIVE,
    });

    // 1. Create a Scheduled Ride
    console.log("Creating Scheduled Ride...");
    const scheduledRide = await Ride.create({
      userId: passenger._id,
      assignedDriverId: driverUser._id,
      carId: car._id,
      serviceAreaId: cityServiceArea._id,
      rideCategory: {
        categoryId: testComfort._id,
        name: "Test Comfort",
        commissionRate: 10,
      },
      pickup: {
        address: "100 Main St, Test City",
        location: { type: "Point", coordinates: [-73.935242, 40.73061] },
      },
      destination: {
        address: "200 Oak Ave, Test City",
        location: { type: "Point", coordinates: [-73.945242, 40.74061] },
      },
      routeInfo: { totalDistanceKm: 5, totalDurationMinutes: 15 },
      driverMatching: {
        requestExpireSeconds: 30,
        searchRadiusKm: 5,
        requiredDriverCount: 1,
        notifiedDrivers: [],
      },
      rideType: RIDE_TYPE.SCHEDULED,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2h from now (so outside the event)
      timezone: "America/New_York",
      status: RIDE_STATUS.SEARCHING_DRIVER,
      pickupVerification: { method: "otp" },
      dropVerification: { method: "otp" },
      fare: {
        baseFare: 5,
        distanceFare: 10,
        timeFare: 5,
        stopWaitingCharge: 0,
        cancellationFee: 5,
        discount: 0,
        subtotal: 20,
        commission: 2,
        driverEarning: 18,
        total: 20,
      },
      requestedAt: new Date(),
    });

    // 2. Create an Airport Ride
    console.log("Creating Airport Ride...");
    const airportRide = await Ride.create({
      userId: passenger._id,
      serviceAreaId: airportServiceArea._id,
      rideCategory: {
        categoryId: testComfort._id,
        name: "Test Comfort",
        commissionRate: 10,
      },
      pickup: {
        address: "JFK Terminal 4",
        location: { type: "Point", coordinates: [-73.778139, 40.641311] },
      },
      destination: {
        address: "Downtown Hotel",
        location: { type: "Point", coordinates: [-73.98513, 40.758896] },
      },
      routeInfo: { totalDistanceKm: 30, totalDurationMinutes: 45 },
      driverMatching: {
        requestExpireSeconds: 30,
        searchRadiusKm: 5,
        requiredDriverCount: 1,
        notifiedDrivers: [],
      },
      rideType: RIDE_TYPE.SCHEDULED,
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // tomorrow
      timezone: "America/New_York",
      status: RIDE_STATUS.SEARCHING_DRIVER,
      pickupVerification: { method: "otp" },
      dropVerification: { method: "otp" },
      fare: {
        baseFare: 10,
        distanceFare: 50,
        timeFare: 15,
        stopWaitingCharge: 0,
        cancellationFee: 10,
        discount: 0,
        subtotal: 75,
        commission: 7.5,
        driverEarning: 67.5,
        total: 75,
      },
      requestedAt: new Date(),
    });

    // 3. Create an Event Ride
    console.log("Creating Event Ride...");
    const eventRide = await Ride.create({
      userId: passenger._id,
      serviceAreaId: cityServiceArea._id,
      rideCategory: {
        categoryId: testComfort._id,
        name: "Test Comfort",
        commissionRate: 10,
      },
      pickup: {
        address: "Convention Center",
        location: { type: "Point", coordinates: [-73.935242, 40.73061] },
      },
      destination: {
        address: "Convention Hotel",
        location: { type: "Point", coordinates: [-73.945242, 40.74061] },
      },
      routeInfo: { totalDistanceKm: 2, totalDurationMinutes: 10 },
      driverMatching: {
        requestExpireSeconds: 30,
        searchRadiusKm: 5,
        requiredDriverCount: 1,
        notifiedDrivers: [],
      },
      rideType: RIDE_TYPE.SCHEDULED,
      scheduledAt: new Date(), // scheduled now (matches active event startDateTime and endDateTime)
      timezone: "America/New_York",
      status: RIDE_STATUS.SEARCHING_DRIVER,
      pickupVerification: { method: "otp" },
      dropVerification: { method: "otp" },
      fare: {
        baseFare: 5,
        distanceFare: 4,
        timeFare: 3,
        stopWaitingCharge: 0,
        cancellationFee: 5,
        discount: 0,
        subtotal: 12,
        commission: 1.2,
        driverEarning: 10.8,
        total: 12,
      },
      requestedAt: new Date(),
    });

    // Create tracking info
    await Tracking.create({
      rideId: scheduledRide._id,
      driverId: driverUser._id,
      userId: passenger._id,
      driverLocation: { type: "Point", coordinates: [-73.93, 40.73] },
      remainingDistanceKm: 1.5,
      estimatedArrivalMinutes: 5,
      totalDistanceKm: 5,
    });

    // --- VERIFY OVERVIEW / LIST API ---
    console.log("\n--- Verification 1: Overview API ---");
    const overview = await ReservationServices.getReservationsOverviewFromDB({
      city: "Test Reservations City",
    });

    console.log("Overview statistics:", overview.statistics);
    assert(
      overview.statistics.totalReservations === 3,
      "totalReservations counts 3 rides",
    );
    assert(
      overview.statistics.scheduledReservations === 1,
      "scheduledReservations counts 1 ride",
    );
    assert(
      overview.statistics.airportReservations === 1,
      "airportReservations counts 1 ride",
    );
    assert(
      overview.statistics.eventReservations === 1,
      "eventReservations counts 1 ride",
    );
    assert(
      overview.statistics.pendingAssignments === 2,
      "pendingAssignments counts 2 rides",
    );

    assert(overview.data.length === 3, "overview data contains 3 rows");

    // Verify specific type resolutions in rows
    const scheduledRow = overview.data.find(
      (r: any) => r.reservationId === scheduledRide._id.toString(),
    );
    const airportRow = overview.data.find(
      (r: any) => r.reservationId === airportRide._id.toString(),
    );
    const eventRow = overview.data.find(
      (r: any) => r.reservationId === eventRide._id.toString(),
    );

    assert(
      scheduledRow?.reservationType === "scheduled",
      "First row is type scheduled",
    );
    assert(
      airportRow?.reservationType === "airport",
      "Second row is type airport",
    );
    assert(eventRow?.reservationType === "event", "Third row is type event");

    // --- VERIFY FILTERS ---
    console.log("\n--- Verification 2: Filtering ---");
    const airportFilter =
      await ReservationServices.getReservationsOverviewFromDB({
        city: "Test Reservations City",
        reservationType: "airport",
      });
    assert(
      airportFilter.data.length === 1 &&
        airportFilter.data[0].reservationId === airportRide._id.toString(),
      "airport filter returns correct ride",
    );

    const eventFilter = await ReservationServices.getReservationsOverviewFromDB(
      {
        city: "Test Reservations City",
        reservationType: "event",
      },
    );
    assert(
      eventFilter.data.length === 1 &&
        eventFilter.data[0].reservationId === eventRide._id.toString(),
      "event filter returns correct ride",
    );

    const scheduledFilter =
      await ReservationServices.getReservationsOverviewFromDB({
        city: "Test Reservations City",
        reservationType: "scheduled",
      });
    assert(
      scheduledFilter.data.length === 1 &&
        scheduledFilter.data[0].reservationId === scheduledRide._id.toString(),
      "scheduled filter returns correct ride",
    );

    // --- VERIFY DETAILS API ---
    console.log("\n--- Verification 3: Details API ---");
    const details = await ReservationServices.getReservationDetailsFromDB(
      scheduledRide._id.toString(),
    );

    assert(
      details.reservation.reservationId === scheduledRide._id.toString(),
      "reservationId correct",
    );
    assert(
      details.reservation.type === "scheduled",
      "reservation type resolved correct",
    );
    assert(
      details.passenger?.fullName === "Test Passenger",
      "passenger populated",
    );
    assert(
      details.passenger?.totalTrips === 0,
      "passenger completed trips fetched",
    );
    assert(
      details.driver?.fullName === "Test Driver",
      "assigned driver populated",
    );
    assert(details.vehicle?.licensePlate === "RESERVE1", "vehicle populated");
    assert(
      details.trip.pickup.address === "100 Main St, Test City",
      "pickup correct",
    );
    assert(details.fare.totalFare === 20, "fare breakdown populated");
    assert(details.timeline.length > 0, "chronological timeline generated");
    assert(
      details.timeline[0].status === "RESERVATION_CREATED" ||
        details.timeline[0].status === "RESERVATION_REQUESTED",
      "timeline first event correct",
    );
    assert(details.tracking?.currentEta === 5, "tracking info retrieved");
    assert(
      details.tracking?.routeProgress === 70,
      "route progress calculated correctly",
    );

    console.log("ALL VERIFICATIONS PASSED SUCCESSFULLY!");
  } finally {
    console.log("Cleaning up...");
    await User.deleteMany({
      email: { $in: ["testpassenger@alygo.com", "testdriver@alygo.com"] },
    });
    await ServiceArea.deleteMany({ city: "Test Reservations City" });
    await RideCategory.deleteMany({ name: "Test Comfort" });
    await Event.deleteMany({ eventName: "Test Event" });
    await Ride.deleteMany({ "rideCategory.name": "Test Comfort" });
    await Tracking.deleteMany({});
    await mongoose.disconnect();
    console.log("Database connection closed.");
  }
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
