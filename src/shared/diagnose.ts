import fs from "fs";
import path from "path";
import { Driver } from "../app/modules/driver/driver.model";
import { User } from "../app/modules/user/user.model";
import { Car } from "../app/modules/car/car.model";
import { ServiceArea } from "../app/modules/serviceArea/serviceArea.model";

export async function runDiagnostics() {
  const logFilePath = path.join(
    __dirname,
    "../../scripts/diagnostic_output.txt",
  );
  const logLines: string[] = [];

  const log = (msg: string) => {
    console.log(msg);
    logLines.push(msg);
  };

  log(
    `=== RUNNING ALYGO DRIVER DIAGNOSTICS AT ${new Date().toISOString()} ===`,
  );

  try {
    const targetUserId = "6a59af155d294c2c4111585d";
    const targetDriverId = "6a86954621b16d027663bdaf";

    // 1. Inspect User
    const userDoc = await User.findById(targetUserId);
    if (!userDoc) {
      log(`❌ User not found with ID ${targetUserId}`);
    } else {
      log(`✅ User found:`);
      log(
        JSON.stringify(
          {
            _id: userDoc._id,
            role: userDoc.role,
            status: userDoc.status,
            verified: userDoc.verified,
            email: userDoc.email,
            phone: userDoc.phone,
          },
          null,
          2,
        ),
      );
    }

    // 2. Inspect Driver(s) for this user
    const driverDocs = await Driver.find({ userId: targetUserId });
    log(
      `\nFound ${driverDocs.length} driver profile(s) for user ID ${targetUserId}:`,
    );
    for (const d of driverDocs) {
      log(
        JSON.stringify(
          {
            _id: d._id,
            userId: d.userId,
            driverAvailabilityStatus: d.driverAvailabilityStatus,
            approvalStatus: d.approvalStatus,
            isDeleted: d.isDeleted,
            location: d.location,
            serviceAreaId: d.serviceAreaId,
            availability: d.availability,
            suspension: d.suspension,
          },
          null,
          2,
        ),
      );
    }

    // Also look specifically for targetDriverId
    const specDriver = await Driver.findById(targetDriverId);
    if (specDriver) {
      log(`\n✅ Specific Driver found with ID ${targetDriverId}:`);
      log(
        JSON.stringify(
          {
            _id: specDriver._id,
            userId: specDriver.userId,
            driverAvailabilityStatus: specDriver.driverAvailabilityStatus,
            approvalStatus: specDriver.approvalStatus,
            isDeleted: specDriver.isDeleted,
            location: specDriver.location,
            serviceAreaId: specDriver.serviceAreaId,
            availability: specDriver.availability,
            suspension: specDriver.suspension,
          },
          null,
          2,
        ),
      );
    } else {
      log(`\n❌ Specific Driver NOT found with ID ${targetDriverId}`);
    }

    // 3. Inspect Car(s)
    // Find all cars in DB to see if any point to either driver ID or user ID
    const driverIds = driverDocs.map((d) => d._id);
    if (
      specDriver &&
      !driverIds.some((id) => id.toString() === specDriver._id.toString())
    ) {
      driverIds.push(specDriver._id);
    }

    const cars = await Car.find({ driverId: { $in: driverIds } });
    log(`\nFound ${cars.length} cars matching these driver profiles:`);
    for (const c of cars) {
      log(
        JSON.stringify(
          {
            _id: c._id,
            driverId: c.driverId,
            carType: c.carType,
            seatNumber: c.seatNumber,
            vehicleName: (c as any).vehicleName || (c as any).carModelName,
            status: (c as any).status || (c as any).isVerified,
          },
          null,
          2,
        ),
      );
    }

    // Also find ALL cars to see if any point to other driver ID/user ID
    const allCars = await Car.find({});
    log(`\nTotal cars in database: ${allCars.length}`);
    for (const c of allCars) {
      log(
        `- Car ${c._id}: driverId = ${c.driverId}, carType = ${c.carType}, seats = ${c.seatNumber}`,
      );
    }

    // 4. Check Service Area
    const serviceAreas = await ServiceArea.find({});
    log(`\n=== Active Service Areas in Database ===`);
    for (const sa of serviceAreas) {
      log(
        JSON.stringify(
          {
            _id: sa._id,
            name: sa.name,
            status: sa.status,
            type: sa.type,
            location: sa.location,
            coverageRadiusKm: sa.coverageRadiusKm,
          },
          null,
          2,
        ),
      );
    }
  } catch (err: any) {
    log(`❌ Error running diagnostics: ${err.message}\n${err.stack}`);
  }

  // Write log to file
  fs.writeFileSync(logFilePath, logLines.join("\n"));
  console.log(`Diagnostics written to: ${logFilePath}`);
}
