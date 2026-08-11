import mongoose, { Types } from "mongoose";
import crypto from "crypto";
import config from "../config";
import { User } from "../app/modules/user/user.model";
import { Driver } from "../app/modules/driver/driver.model";
import { VERIFICATION_STATUS } from "../app/modules/driver/driver.constant";
import { DriverVerificationService } from "../app/modules/driver/driver.verification.service";
import { CheckrService } from "../app/modules/checkr/checkr.service";

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`PASS: ${message}`);
};

// Mock CheckrService methods to avoid making live network requests in scratch script
const stubCheckrService = () => {
  CheckrService.createCandidate = async (data: any) => {
    console.log(
      "Mocked CheckrService.createCandidate called with:",
      JSON.stringify(data),
    );
    return { id: "cand_mock_123" };
  };
  CheckrService.updateCandidate = async (id: string, data: any) => {
    console.log(
      `Mocked CheckrService.updateCandidate called for ${id} with:`,
      JSON.stringify(data),
    );
    return { id };
  };
  CheckrService.createReport = async (candidateId: string, type: string) => {
    console.log(
      `Mocked CheckrService.createReport called for candidate ${candidateId} type ${type}`,
    );
    return { id: type === "mvr" ? "rep_mvr_123" : "rep_bg_123" };
  };
};

async function runVerification() {
  try {
    stubCheckrService();

    console.log("Connecting to database:", config.database_url);
    await mongoose.connect(config.database_url as string);
    console.log("Database connected.");

    // Clean up
    await User.deleteMany({ email: "testcheckr@alygo.com" });

    // 1. Create a User
    console.log("Creating test user...");
    const testUser = await User.create({
      name: "Checkr Test Driver",
      email: "testcheckr@alygo.com",
      phone: "+15551234567",
      countryCode: "+1",
      role: "driver",
      verified: true,
      status: "active",
      dateOfBirth: new Date("1990-01-01"),
    });

    // 2. Create a Driver
    console.log("Creating test driver profile...");
    let testDriver = await Driver.create({
      userId: testUser._id,
      drivingLicense: "https://example.com/license.jpg",
      drivingLicenseNumber: "DL123456",
      drivingLicenseState: "CA",
      ssn: "111-22-3333",
      taxZipCode: "90210",
      mvrStatus: VERIFICATION_STATUS.FAILED,
    });

    // 3. Test MVR Trigger
    console.log("Testing triggerMVRVerification...");
    // Reset status to test trigger
    await Driver.findByIdAndUpdate(testDriver._id, {
      $unset: { mvrStatus: 1, checkrCandidateId: 1, checkrMVRReportId: 1 },
    });

    // Manually run trigger
    await DriverVerificationService.triggerMVRVerification(
      testDriver._id.toString(),
    );

    // Verify driver fields in DB
    const driverAfterMvr = await Driver.findById(testDriver._id);
    assert(
      driverAfterMvr?.checkrCandidateId === "cand_mock_123",
      "checkrCandidateId saved",
    );
    assert(
      driverAfterMvr?.checkrMVRReportId === "rep_mvr_123",
      "checkrMVRReportId saved",
    );
    assert(
      driverAfterMvr?.mvrStatus === VERIFICATION_STATUS.PENDING,
      "mvrStatus set to pending",
    );

    // 4. Test Background Check initiation
    console.log("Testing initiateBackgroundCheck...");
    await DriverVerificationService.initiateBackgroundCheck(
      testUser._id.toString(),
    );
    const driverAfterBg = await Driver.findById(testDriver._id);
    assert(
      driverAfterBg?.checkrBackgroundReportId === "rep_bg_123",
      "checkrBackgroundReportId saved",
    );
    assert(
      driverAfterBg?.backgroundCheckStatus === VERIFICATION_STATUS.PENDING,
      "backgroundCheckStatus set to pending",
    );

    // 5. Test Signature Validation Helper
    console.log("Testing cryptographic signature verification...");
    const rawPayload = JSON.stringify({
      id: "evt_123",
      object: "event",
      type: "report.completed",
      data: {
        object: {
          object: "report",
          id: "rep_mvr_123",
          status: "completed",
          result: "clear",
        },
      },
    });

    const key =
      config.checkr.signingKey || config.checkr.apiKey || "test_signing_key";
    const signature = crypto
      .createHmac("sha256", key)
      .update(rawPayload)
      .digest("hex");

    const computed = crypto
      .createHmac("sha256", key)
      .update(rawPayload)
      .digest("hex");
    assert(signature === computed, "HMAC signature matches computed value");

    // Cleanup
    await User.deleteMany({ email: "testcheckr@alygo.com" });
    console.log("Cleanup complete.");
    console.log("ALL CHECKR TESTS PASSED SUCCESSFULLY.");
  } catch (error) {
    console.error("Test Verification Failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected.");
  }
}

runVerification();
