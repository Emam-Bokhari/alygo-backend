import { Types } from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { Driver } from "./driver.model";
import { User } from "../user/user.model";
import { CheckrService } from "../checkr/checkr.service";
import { VERIFICATION_STATUS } from "./driver.constant";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";

/**
 * Automatically evaluates and triggers driving license / MVR check on Checkr
 */
const triggerMVRVerification = async (driverId: string): Promise<void> => {
  try {
    const driver = await Driver.findById(driverId);
    if (!driver) return;

    // Check if verification is already in progress or verified to prevent duplicate reports
    if (
      driver.checkrMVRReportId &&
      (driver.mvrStatus === VERIFICATION_STATUS.PENDING ||
        driver.mvrStatus === VERIFICATION_STATUS.PROCESSING ||
        driver.mvrStatus === VERIFICATION_STATUS.VERIFIED)
    ) {
      return;
    }

    const user = await User.findById(driver.userId);
    if (!user) return;

    // Check if required candidate and license details are present
    const nameParts = (user.name || "").trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || firstName;
    const email = user.email;
    const phone = user.phone;
    const dob = user.dateOfBirth;
    const licenseNumber = driver.drivingLicenseNumber;
    const licenseState = driver.drivingLicenseState || driver.taxState;

    // We can only trigger MVR if all required fields are present
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !dob ||
      !licenseNumber ||
      !licenseState
    ) {
      return;
    }

    // Format Date of Birth to YYYY-MM-DD
    const formattedDob = dob.toISOString().split("T")[0];

    let candidateId: string | undefined = driver.checkrCandidateId;
    if (!candidateId) {
      // Create new candidate on Checkr
      const candidate = await CheckrService.createCandidate({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        dob: formattedDob,
        driver_license_number: licenseNumber,
        driver_license_state: licenseState,
        copy_requested: true,
        work_locations: [{ country: "US" }],
      });
      candidateId = candidate.id;
    } else {
      // Reuse and update candidate with latest license details
      await CheckrService.updateCandidate(candidateId, {
        driver_license_number: licenseNumber,
        driver_license_state: licenseState,
      });
    }

    if (!candidateId) {
      throw new Error("Failed to resolve candidate ID");
    }

    // Create Checkr MVR report
    const report = await CheckrService.createReport(candidateId, "mvr");

    // Save Checkr Candidate and Report ID to Driver and set status to pending
    await Driver.findByIdAndUpdate(driverId, {
      $set: {
        checkrCandidateId: candidateId,
        checkrMVRReportId: report.id,
        mvrStatus: VERIFICATION_STATUS.PENDING,
      },
    });

    // Notify Driver
    await sendNotifications({
      receiver: driver.userId,
      type: NOTIFICATION_TYPE.DRIVER,
      title: "MVR Verification Started",
      text: "Your driving license / MVR verification has started.",
    });
  } catch (error: any) {
    console.error(
      "Failed to automatically trigger Checkr MVR Verification:",
      error.message || error,
    );
    // Mark status as failed in case of unrecoverable candidate/report creation error
    await Driver.findByIdAndUpdate(driverId, {
      $set: {
        mvrStatus: VERIFICATION_STATUS.FAILED,
      },
    });
  }
};

/**
 * Manually initiates criminal background check for the authenticated driver
 */
const initiateBackgroundCheck = async (
  driverUserId: string,
  payload?: {
    dateOfBirth?: string | Date;
    dob?: string | Date;
    ssn?: string;
    zipcode?: string;
    taxZipCode?: string;
  },
) => {
  const driver = await Driver.findOne({
    userId: new Types.ObjectId(driverUserId),
  });
  if (!driver) {
    throw new ApiError(404, "Driver profile not found");
  }

  const user = await User.findById(driver.userId);
  if (!user) {
    throw new ApiError(404, "User profile not found");
  }

  // Update user profile if date of birth is provided
  const dobInput = payload?.dateOfBirth || payload?.dob;
  if (dobInput) {
    const parsedDob = new Date(dobInput);
    if (isNaN(parsedDob.getTime())) {
      throw new ApiError(400, "Invalid date format for date of birth");
    }
    user.dateOfBirth = parsedDob;
    await user.save();
  }

  // Update driver profile if ssn or zipcode is provided
  const ssnInput = payload?.ssn;
  const zipcodeInput = payload?.taxZipCode || payload?.zipcode;

  const driverUpdates: Record<string, any> = {};
  if (ssnInput) {
    driverUpdates.ssn = ssnInput;
    driver.ssn = ssnInput;
  }
  if (zipcodeInput) {
    driverUpdates.taxZipCode = zipcodeInput;
    driver.taxZipCode = zipcodeInput;
  }

  if (Object.keys(driverUpdates).length > 0) {
    await Driver.findByIdAndUpdate(driver._id, { $set: driverUpdates });
  }

  // Prevent duplicate background check reports
  if (
    driver.checkrBackgroundReportId &&
    (driver.backgroundCheckStatus === VERIFICATION_STATUS.PENDING ||
      driver.backgroundCheckStatus === VERIFICATION_STATUS.PROCESSING ||
      driver.backgroundCheckStatus === VERIFICATION_STATUS.VERIFIED)
  ) {
    throw new ApiError(
      400,
      "Background check is already in progress or has been verified.",
    );
  }

  // Validate required information for Candidate & Background Check
  const nameParts = (user.name || "").trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || firstName;
  const email = user.email;
  const phone = user.phone;
  const dob = user.dateOfBirth;
  const ssn = driver.ssn;
  const zipcode = driver.taxZipCode;

  if (!firstName || !lastName || !email || !phone || !dob) {
    throw new ApiError(
      400,
      "User profile is missing name, email, phone, or date of birth.",
    );
  }

  if (!ssn || !zipcode) {
    throw new ApiError(
      400,
      "Driver profile requires SSN and Zip Code to run background check.",
    );
  }

  const formattedDob = dob.toISOString().split("T")[0];

  let candidateId: string | undefined = driver.checkrCandidateId;
  if (!candidateId) {
    // Create candidate
    const candidate = await CheckrService.createCandidate({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      dob: formattedDob,
      ssn,
      zipcode,
      copy_requested: true,
      work_locations: [{ country: "US" }],
    });
    candidateId = candidate.id;
  } else {
    // Update candidate details
    await CheckrService.updateCandidate(candidateId, {
      ssn,
      zipcode,
    });
  }

  if (!candidateId) {
    throw new ApiError(500, "Failed to resolve Checkr candidate ID");
  }

  // Create Background Check report
  const report = await CheckrService.createReport(candidateId, "background");

  // Save report ID and update status to pending
  const updatedDriver = await Driver.findByIdAndUpdate(
    driver._id,
    {
      $set: {
        checkrCandidateId: candidateId,
        checkrBackgroundReportId: report.id,
        backgroundCheckStatus: VERIFICATION_STATUS.PENDING,
        backgroundCheckPassed: false,
      },
    },
    { new: true },
  );

  // Notify Driver
  await sendNotifications({
    receiver: driver.userId,
    type: NOTIFICATION_TYPE.DRIVER,
    title: "Background Check Started",
    text: "Your criminal background check has started.",
  });

  return updatedDriver;
};

export const DriverVerificationService = {
  triggerMVRVerification,
  initiateBackgroundCheck,
};
