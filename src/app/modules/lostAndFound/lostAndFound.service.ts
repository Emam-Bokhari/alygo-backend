import { StatusCodes } from "http-status-codes";
import mongoose, { Types, ClientSession } from "mongoose";
import { LostFound } from "./lostAndFound.model";
import { Ride } from "../ride/ride.model";
import { User } from "../user/user.model";
import { LostAndFoundItemCategory } from "../lostAndFoundItemCategory/lostAndFoundItemCategory.model";
import { Driver } from "../driver/driver.model";
import { Car } from "../car/car.model";
import { STATUS } from "../../../constants/status";
import { TransactionService } from "../transaction/transaction.service";
import { WalletService } from "../wallet/wallet.service";
import stripeService from "../stripe/stripe.service";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../builder/queryBuilder";
import { socketHelper } from "../../../helpers/socketHelper";
import { sendNotifications } from "../../../helpers/notificationsHelper";
import { getSystemConfig } from "../../../helpers/systemConfigHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.constant";
import { TRANSACTION_TYPE } from "../transaction/transaction.constant";
import { PAYMENT_METHOD, PAYMENT_STATUS as RidePaymentStatus } from "../ride/ride.constant";
import {
  REPORT_STATUS,
  RECOVERY_METHOD,
  FOUND_STATUS,
  PAYMENT_STATUS,
} from "./lostAndFound.constant";

// Helper to generate unique report number
const generateReportNumber = async (): Promise<string> => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `LF-${dateStr}-${randomSuffix}`;
};

// Helper to record audit log
const logAudit = async (
  reportId: string | Types.ObjectId,
  action: string,
  actorId: string | Types.ObjectId,
  actorRole: string,
  details?: Record<string, any>,
  session?: ClientSession,
) => {
  await LostFound.findByIdAndUpdate(
    reportId,
    {
      $push: {
        auditLogs: {
          action,
          actor: new Types.ObjectId(actorId),
          actorRole,
          details,
          timestamp: new Date(),
        },
      },
    },
    { session },
  );
};

// ----------------------------------------------------
// Passenger Flows
// ----------------------------------------------------

const reportLostItem = async (
  passengerId: string,
  payload: {
    rideId: string;
    itemName: string;
    itemCategory: string;
    itemDescription: string;
    lastSeenLocation: string;
    preferredRecoveryOption?: RECOVERY_METHOD;
    uploadedFiles?: { fileUrl: string; fileName?: string; uploadedAt?: Date }[];
  },
): Promise<any> => {
  const systemConfig = await getSystemConfig();
  if (systemConfig.lostFound && !systemConfig.lostFound.enabled) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Lost & Found service is currently disabled.");
  }

  // File limit validation
  const maxFiles = systemConfig.lostFound?.maxFiles ?? 5;
  if (payload.uploadedFiles && payload.uploadedFiles.length > maxFiles) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `You can upload a maximum of ${maxFiles} files.`,
    );
  }

  // 1. Validate Ride
  const ride = await Ride.findById(payload.rideId);
  if (!ride) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ride not found.");
  }

  // Only ride owner (passenger)
  if (ride.userId.toString() !== passengerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You are not authorized to report lost items for this ride.");
  }

  // Ride must be COMPLETED
  if (ride.status !== "completed") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Lost items can only be reported for completed rides.");
  }

  // Ride too old validation (default 7 days)
  const windowDays = systemConfig.lostFound?.reportWindowDays ?? 7;
  const completedTime = ride.completedAt ? new Date(ride.completedAt).getTime() : new Date(ride.updatedAt).getTime();
  const timeLimit = completedTime + windowDays * 24 * 60 * 60 * 1000;
  if (Date.now() > timeLimit) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Reports must be submitted within ${windowDays} days of ride completion.`,
    );
  }

  // 2. Prevent duplicate active report for same ride
  const existingReport = await LostFound.findOne({
    rideId: payload.rideId,
    reportStatus: { $nin: [REPORT_STATUS.CLOSED, REPORT_STATUS.CANCELLED] },
  });
  if (existingReport) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "An active report already exists for this ride.");
  }

  // 3. Category Validation
  const categoryExists = await LostAndFoundItemCategory.findOne({
    _id: payload.itemCategory,
    status: STATUS.ACTIVE,
  });
  if (!categoryExists) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid or inactive item category.");
  }

  // 4. Resolve Driver ID
  if (!ride.driverId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "No driver is associated with this ride.");
  }

  const reportNumber = await generateReportNumber();

  // 5. Create Report
  const newReport = await LostFound.create({
    rideId: ride._id,
    passengerId: new Types.ObjectId(passengerId),
    driverId: ride.driverId,
    reportNumber,
    itemName: payload.itemName,
    itemCategory: new Types.ObjectId(payload.itemCategory),
    itemDescription: payload.itemDescription,
    uploadedFiles: payload.uploadedFiles || [],
    lastSeenLocation: payload.lastSeenLocation,
    reportStatus: REPORT_STATUS.REPORTED,
    foundStatus: FOUND_STATUS.PENDING,
    recoveryMethod: payload.preferredRecoveryOption,
    createdBy: new Types.ObjectId(passengerId),
  });

  // Log Audit
  await logAudit(
    newReport._id,
    "REPORT_CREATED",
    passengerId,
    "USER",
    {
      reportNumber,
      itemName: payload.itemName,
      category: categoryExists.name,
    },
  );

  // Sockets
  socketHelper.sendToUser(passengerId, "lost-found-created", newReport);
  socketHelper.sendToUser(ride.driverId.toString(), "new-lost-item-request", newReport);
  // Admin socket broadcast
  const io = (global as any).io;
  if (io) {
    io.emit("lost-found-created", newReport);
  }

  // Notifications
  await sendNotifications({
    title: "New Lost Item Request",
    text: `A passenger reported a lost item: ${payload.itemName} for ride ${reportNumber}`,
    receiver: ride.driverId,
    type: NOTIFICATION_TYPE.DRIVER,
    referenceId: newReport._id,
    referenceModel: "LostFound",
  });

  return newReport;
};

const getMyReports = async (
  passengerId: string,
  query: Record<string, unknown>,
): Promise<{ data: any[]; meta: any }> => {
  const searchableFields = ["itemName", "reportNumber", "itemDescription"];
  const baseQuery = LostFound.find({ passengerId: new Types.ObjectId(passengerId) }).populate({ path: "itemCategory" });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  return { data, meta };
};

const getReportDetails = async (
  reportId: string,
  userId: string,
  role: string,
): Promise<any> => {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid report ID.");
  }

  const report = await LostFound.findById(reportId)
    .populate({ path: "rideId" })
    .populate({ path: "passengerId", select: "name email phone profileImage" })
    .populate({ path: "driverId", select: "name email phone profileImage" })
    .populate({ path: "itemCategory" });

  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Report not found.");
  }

  // Auth check: passenger, driver, or admin only
  if (
    role !== "ADMIN" &&
    role !== "SUPER_ADMIN" &&
    report.passengerId._id.toString() !== userId &&
    report.driverId._id.toString() !== userId
  ) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You are not authorized to view this report.");
  }

  // Fetch driver profile
  const driverProfile = await Driver.findOne({ userId: report.driverId._id });

  // Fetch driver car
  let car = null;
  if (report.rideId && (report.rideId as any).carId) {
    car = await Car.findById((report.rideId as any).carId);
  }
  if (!car) {
    car = await Car.findOne({ driverId: report.driverId._id });
  }

  // Count completed rides
  const completedRidesCount = await Ride.countDocuments({
    driverId: report.driverId._id,
    status: "completed",
  });

  const driverInfo = {
    name: (report.driverId as any).name,
    profileImage: (report.driverId as any).profileImage,
    rating: driverProfile?.averageRating ?? 0,
    trips: `${completedRidesCount} Trips`,
    licenseNumber: car?.licensePlate ?? "N/A",
    vehicle: car ? `${car.brand} ${car.model}`.trim() : "N/A",
  };

  return {
    ...report.toObject(),
    driverInfo,
  };
};

const confirmItemReceived = async (
  reportId: string,
  passengerId: string,
): Promise<any> => {
  const report = await LostFound.findById(reportId);
  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Report not found.");
  }

  if (report.passengerId.toString() !== passengerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only the passenger who reported the item can confirm receipt.");
  }

  if (report.reportStatus !== REPORT_STATUS.RETURN_COMPLETED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Return must be completed by the driver first.");
  }

  if (report.passengerConfirmed) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Receipt has already been confirmed.");
  }

  report.passengerConfirmed = true;
  report.reportStatus = REPORT_STATUS.RECEIVED;
  await report.save();

  // Log Audit
  await logAudit(report._id, "PASSENGER_CONFIRMED", passengerId, "USER");

  // Automatically transition to CLOSED if finalized
  report.reportStatus = REPORT_STATUS.CLOSED;
  await report.save();

  // Sockets
  socketHelper.sendToUser(passengerId, "lost-found-confirmed", report);
  socketHelper.sendToUser(report.driverId.toString(), "return-confirmed", report);

  // Push notification
  await sendNotifications({
    title: "Return Confirmed",
    text: `The passenger has confirmed receipt of their lost item: ${report.itemName}.`,
    receiver: report.driverId,
    type: NOTIFICATION_TYPE.DRIVER,
    referenceId: report._id,
    referenceModel: "LostFound",
  });

  return report;
};

const submitDriverRating = async (
  reportId: string,
  passengerId: string,
  payload: { rating: number; review?: string },
): Promise<any> => {
  const report = await LostFound.findById(reportId);
  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Report not found.");
  }

  if (report.passengerId.toString() !== passengerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only the passenger can submit a rating.");
  }

  if (!report.passengerConfirmed) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Receipt must be confirmed before rating.");
  }

  if (report.passengerRated) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "You have already rated this return.");
  }

  report.passengerRated = true;
  report.passengerRating = payload.rating;
  report.passengerReview = payload.review || "";
  await report.save();

  // Log Audit
  await logAudit(report._id, "RATING_SUBMITTED", passengerId, "USER", {
    rating: payload.rating,
  });

  return report;
};

// ----------------------------------------------------
// Driver Flows
// ----------------------------------------------------

const getDriverReports = async (
  driverId: string,
  query: Record<string, unknown>,
): Promise<{ data: any[]; meta: any }> => {
  const searchableFields = ["itemName", "reportNumber", "itemDescription"];
  const baseQuery = LostFound.find({ driverId: new Types.ObjectId(driverId) }).populate({ path: "itemCategory" });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  return { data, meta };
};

const markFound = async (
  reportId: string,
  driverId: string,
  payload: { driverNotes?: string },
): Promise<any> => {
  const report = await LostFound.findById(reportId);
  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Report not found.");
  }

  if (report.driverId.toString() !== driverId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only the assigned driver can resolve this report.");
  }

  if (report.reportStatus === REPORT_STATUS.CLOSED || report.reportStatus === REPORT_STATUS.CANCELLED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot update a closed or cancelled report.");
  }

  if (report.foundStatus === FOUND_STATUS.FOUND) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Item has already been marked as found.");
  }

  report.foundStatus = FOUND_STATUS.FOUND;
  report.reportStatus = REPORT_STATUS.FOUND;
  report.driverNotes = payload.driverNotes || "";
  await report.save();

  // Log Audit
  await logAudit(report._id, "DRIVER_FOUND", driverId, "DRIVER", {
    notes: payload.driverNotes,
  });

  // Sockets
  socketHelper.sendToUser(report.passengerId.toString(), "lost-found-found", report);

  // Push notification
  await sendNotifications({
    title: "Lost Item Found!",
    text: `The driver found your lost item: ${report.itemName}. Please choose a recovery method.`,
    receiver: report.passengerId,
    type: NOTIFICATION_TYPE.USER,
    referenceId: report._id,
    referenceModel: "LostFound",
  });

  return report;
};

const markNotFound = async (
  reportId: string,
  driverId: string,
  payload: { reason: string; driverNotes?: string },
): Promise<any> => {
  const report = await LostFound.findById(reportId);
  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Report not found.");
  }

  if (report.driverId.toString() !== driverId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only the assigned driver can resolve this report.");
  }

  if (report.reportStatus === REPORT_STATUS.CLOSED || report.reportStatus === REPORT_STATUS.CANCELLED) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Cannot update a closed or cancelled report.");
  }

  if (report.foundStatus === FOUND_STATUS.FOUND) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Item has already been marked as found.");
  }

  report.foundStatus = FOUND_STATUS.NOT_FOUND;
  report.reportStatus = REPORT_STATUS.NOT_FOUND;
  report.driverNotes = `Reason: ${payload.reason}. Notes: ${payload.driverNotes || ""}`;
  await report.save();

  // Log Audit
  await logAudit(report._id, "DRIVER_NOT_FOUND", driverId, "DRIVER", {
    reason: payload.reason,
    notes: payload.driverNotes,
  });

  // Sockets
  socketHelper.sendToUser(report.passengerId.toString(), "lost-found-not-found", report);

  // Push notification
  await sendNotifications({
    title: "Lost Item Not Found",
    text: `The driver was unable to locate your lost item: ${report.itemName}.`,
    receiver: report.passengerId,
    type: NOTIFICATION_TYPE.USER,
    referenceId: report._id,
    referenceModel: "LostFound",
  });

  return report;
};

const configureRecovery = async (
  reportId: string,
  driverId: string,
  payload: {
    recoveryMethod: RECOVERY_METHOD;
    address?: string;
    coordinates?: [number, number];
    deliveryFee?: number;
    scheduledAt?: Date;
  },
): Promise<any> => {
  const report = await LostFound.findById(reportId);
  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Report not found.");
  }

  if (report.driverId.toString() !== driverId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only the assigned driver can configure recovery.");
  }

  if (report.foundStatus !== FOUND_STATUS.FOUND) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Recovery can only be configured for items that have been found.");
  }

  report.recoveryMethod = payload.recoveryMethod;

  if (payload.recoveryMethod === RECOVERY_METHOD.PASSENGER_PICKUP) {
    // Passenger Pickup: no delivery fee, no payment needed
    report.deliveryFee = 0;
    report.paymentStatus = PAYMENT_STATUS.NOT_REQUIRED;
    report.reportStatus = REPORT_STATUS.RETURN_SCHEDULED;
    if (payload.address && payload.coordinates) {
      report.pickupLocation = {
        type: "Point",
        coordinates: payload.coordinates,
        address: payload.address,
      };
    }
    if (payload.scheduledAt) {
      report.scheduledAt = payload.scheduledAt;
    }
    await report.save();

    // Sockets
    socketHelper.sendToUser(report.passengerId.toString(), "lost-found-return-scheduled", report);

    // Push notification
    await sendNotifications({
      title: "Pickup Scheduled",
      text: `Your pickup return arrangement has been set for: ${report.itemName}.`,
      receiver: report.passengerId,
      type: NOTIFICATION_TYPE.USER,
      referenceId: report._id,
      referenceModel: "LostFound",
    });
  } else {
    // Driver Delivery
    const deliveryFee = payload.deliveryFee ?? 0;
    report.deliveryFee = deliveryFee;
    if (payload.address && payload.coordinates) {
      report.deliveryLocation = {
        type: "Point",
        coordinates: payload.coordinates,
        address: payload.address,
      };
    }
    if (payload.scheduledAt) {
      report.scheduledAt = payload.scheduledAt;
    }

    if (deliveryFee > 0) {
      report.paymentStatus = PAYMENT_STATUS.PENDING;
      report.reportStatus = REPORT_STATUS.WAITING_PAYMENT;
      await report.save();

      // Sockets
      socketHelper.sendToUser(report.passengerId.toString(), "lost-found-payment-required", report);

      // Push notification
      await sendNotifications({
        title: "Payment Required for Delivery",
        text: `A delivery fee of ${deliveryFee} is required to return your item: ${report.itemName}.`,
        receiver: report.passengerId,
        type: NOTIFICATION_TYPE.USER,
        referenceId: report._id,
        referenceModel: "LostFound",
      });
    } else {
      report.paymentStatus = PAYMENT_STATUS.NOT_REQUIRED;
      report.reportStatus = REPORT_STATUS.RETURN_SCHEDULED;
      await report.save();

      // Sockets
      socketHelper.sendToUser(report.passengerId.toString(), "lost-found-return-scheduled", report);

      // Push notification
      await sendNotifications({
        title: "Return Delivery Scheduled",
        text: `Your delivery return arrangement has been set for: ${report.itemName}.`,
        receiver: report.passengerId,
        type: NOTIFICATION_TYPE.USER,
        referenceId: report._id,
        referenceModel: "LostFound",
      });
    }
  }

  // Log Audit
  await logAudit(report._id, "RECOVERY_SELECTED", driverId, "DRIVER", {
    method: payload.recoveryMethod,
    fee: report.deliveryFee,
  });

  return report;
};

const markReturned = async (reportId: string, driverId: string): Promise<any> => {
  const report = await LostFound.findById(reportId);
  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Report not found.");
  }

  if (report.driverId.toString() !== driverId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only the assigned driver can mark return completed.");
  }

  if (report.paymentStatus === PAYMENT_STATUS.PENDING) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Payment is required before returning the item.");
  }

  report.driverConfirmed = true;
  report.reportStatus = REPORT_STATUS.RETURN_COMPLETED;
  await report.save();

  // Log Audit
  await logAudit(report._id, "RETURN_COMPLETED", driverId, "DRIVER");

  // Sockets
  socketHelper.sendToUser(report.passengerId.toString(), "lost-found-return-completed", report);

  // Push notification
  await sendNotifications({
    title: "Lost Item Returned",
    text: `The driver has marked your lost item returned: ${report.itemName}. Please confirm receipt.`,
    receiver: report.passengerId,
    type: NOTIFICATION_TYPE.USER,
    referenceId: report._id,
    referenceModel: "LostFound",
  });

  return report;
};

// ----------------------------------------------------
// Payment Flow Helpers
// ----------------------------------------------------

const createPaymentSession = async (
  reportId: string,
  passengerId: string,
): Promise<any> => {
  const report = await LostFound.findById(reportId);
  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Report not found.");
  }

  if (report.passengerId.toString() !== passengerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Only the report owner can process payment.");
  }

  if (report.reportStatus !== REPORT_STATUS.WAITING_PAYMENT) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Payment is not required or already completed.");
  }

  const user = await User.findById(passengerId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Passenger user profile not found.");
  }

  const stripeCustomerId = await stripeService.getOrCreateCustomer(
    passengerId,
    user.email,
    user.name,
  );

  const successUrl = `${config.client_url || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}&reportId=${reportId}`;
  const cancelUrl = `${config.client_url || "http://localhost:3000"}/payment/cancel?session_id={CHECKOUT_SESSION_ID}&reportId=${reportId}`;

  const session = await stripeService.createCheckoutSession(
    report.deliveryFee,
    config.stripe.currency || "usd",
    {
      type: "lost_found_payment",
      reportId: report._id.toString(),
      rideId: report.rideId.toString(),
      passengerId,
      driverId: report.driverId.toString(),
      amount: report.deliveryFee.toString(),
      currency: config.stripe.currency || "usd",
    },
    stripeCustomerId,
    successUrl,
    cancelUrl,
  );

  // Store checkout metadata
  report.paymentIntentId = session.payment_intent as string;
  await report.save();

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
    amount: report.deliveryFee,
  };
};

const completeLostFoundPayment = async (
  reportId: string,
  paymentIntentId: string,
  stripeSession: any,
): Promise<void> => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    const report = await LostFound.findById(reportId).session(dbSession);
    if (!report) {
      throw new ApiError(StatusCodes.NOT_FOUND, "LostFound report not found.");
    }

    if (report.paymentStatus === PAYMENT_STATUS.PAID) {
      await dbSession.commitTransaction();
      dbSession.endSession();
      return;
    }

    const driverProfile = await Driver.findOne({ userId: report.driverId }).session(dbSession);
    if (!driverProfile) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Driver profile not found.");
    }

    // 1. Create Transaction
    const transactionId = `TXN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTx = await TransactionService.createTransaction(
      {
        transactionId,
        userId: report.passengerId,
        driverId: driverProfile._id,
        bookingId: report.rideId,
        rideId: report.rideId,
        amount: report.deliveryFee,
        currency: stripeSession.currency || config.stripe.currency || "usd",
        paymentMethod: PAYMENT_METHOD.STRIPE,
        paymentStatus: RidePaymentStatus.PAID,
        transactionType: TRANSACTION_TYPE.LOST_FOUND_DELIVERY,
        gatewayTransactionId: paymentIntentId,
        gatewayResponse: stripeSession,
        description: `Delivery fee for lost item report ${report.reportNumber}`,
      },
      dbSession,
    );

    // 2. Add delivery fee to driver's wallet
    const driverWallet = await WalletService.getOrCreateWallet(report.driverId, dbSession);
    driverWallet.balance = parseFloat((driverWallet.balance + report.deliveryFee).toFixed(2));
    await driverWallet.save({ session: dbSession });

    // 3. Update report statuses
    report.paymentStatus = PAYMENT_STATUS.PAID;
    report.reportStatus = REPORT_STATUS.PAYMENT_COMPLETED;
    report.paymentIntentId = paymentIntentId;
    report.paymentTransactionId = newTx._id;
    report.paymentReference = paymentIntentId;
    report.paymentAmount = report.deliveryFee;
    report.paymentCurrency = stripeSession.currency || config.stripe.currency || "usd";

    // Also automatically transition to RETURN_SCHEDULED
    report.reportStatus = REPORT_STATUS.RETURN_SCHEDULED;
    await report.save({ session: dbSession });

    // Record audit log inside transaction
    report.auditLogs.push({
      action: "PAYMENT_COMPLETED",
      actor: report.passengerId,
      actorRole: "USER",
      details: { transactionId: newTx.transactionId, fee: report.deliveryFee },
      timestamp: new Date(),
    });
    await report.save({ session: dbSession });

    await dbSession.commitTransaction();
    dbSession.endSession();

    // Sockets & Notifications (outside transaction block)
    socketHelper.sendToUser(report.passengerId.toString(), "lost-found-payment-success", report);
    socketHelper.sendToUser(report.driverId.toString(), "passenger-confirmed-payment", report);
    socketHelper.sendToUser(report.driverId.toString(), "wallet-updated", {
      balance: driverWallet.balance,
    });

    await sendNotifications({
      title: "Lost Item Delivery Paid",
      text: `Passenger paid delivery fee of ${report.deliveryFee} for item ${report.itemName}. Return is scheduled.`,
      receiver: report.driverId,
      type: NOTIFICATION_TYPE.DRIVER,
      referenceId: report._id,
      referenceModel: "LostFound",
    });
  } catch (error) {
    await dbSession.abortTransaction();
    dbSession.endSession();
    throw error;
  }
};

const handleLostFoundPaymentFailed = async (
  reportId: string,
  gatewayResponse: any,
): Promise<void> => {
  const report = await LostFound.findById(reportId);
  if (report && report.paymentStatus !== PAYMENT_STATUS.PAID) {
    report.paymentStatus = PAYMENT_STATUS.FAILED;
    await report.save();

    await logAudit(report._id, "PAYMENT_FAILED", report.passengerId, "USER", {
      response: gatewayResponse,
    });

    // Notify passenger
    socketHelper.sendToUser(report.passengerId.toString(), "lost-found-payment-failed", report);
  }
};

// ----------------------------------------------------
// Admin Flows
// ----------------------------------------------------

const getAllReports = async (query: Record<string, unknown>): Promise<{ data: any[]; meta: any }> => {
  const searchableFields = ["itemName", "reportNumber", "itemDescription"];
  const baseQuery = LostFound.find()
    .populate({ path: "rideId" })
    .populate({ path: "passengerId", select: "name email phone profileImage" })
    .populate({ path: "driverId", select: "name email phone profileImage" })
    .populate({ path: "itemCategory" });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  return { data, meta };
};

const adminUpdateReport = async (
  reportId: string,
  adminId: string,
  payload: {
    reportStatus?: REPORT_STATUS;
    foundStatus?: FOUND_STATUS;
    deliveryFee?: number;
    adminNotes?: string;
    recoveryMethod?: RECOVERY_METHOD;
  },
): Promise<any> => {
  const report = await LostFound.findById(reportId);
  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Report not found.");
  }

  const updates: any = {};
  if (payload.reportStatus) updates.reportStatus = payload.reportStatus;
  if (payload.foundStatus) updates.foundStatus = payload.foundStatus;
  if (payload.deliveryFee !== undefined) updates.deliveryFee = payload.deliveryFee;
  if (payload.adminNotes) updates.adminNotes = payload.adminNotes;
  if (payload.recoveryMethod) updates.recoveryMethod = payload.recoveryMethod;

  const updatedReport = await LostFound.findByIdAndUpdate(reportId, updates, {
    new: true,
  });

  // Log Audit
  await logAudit(reportId, "ADMIN_ACTION", adminId, "ADMIN", updates);

  // If escalated (transitioned to UNDER_REVIEW or similar status)
  if (payload.reportStatus === REPORT_STATUS.UNDER_REVIEW) {
    const io = (global as any).io;
    if (io) {
      io.emit("lost-found-escalated", updatedReport);
    }
  }

  // Sync sockets to both driver & passenger on admin overrides
  socketHelper.sendToUser(report.passengerId.toString(), "lost-found-driver-reviewing", updatedReport);
  socketHelper.sendToUser(report.driverId.toString(), "new-lost-item-request", updatedReport);

  return updatedReport;
};

const trackReportStatus = async (
  reportId: string,
  passengerId: string,
): Promise<any> => {
  const report = await LostFound.findById(reportId)
    .populate({ path: "rideId" })
    .populate({ path: "passengerId", select: "name email phone profileImage" })
    .populate({ path: "driverId", select: "name email phone profileImage" })
    .populate({ path: "itemCategory" });

  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Report not found.");
  }

  if (report.passengerId._id.toString() !== passengerId) {
    throw new ApiError(StatusCodes.FORBIDDEN, "You are not authorized to track this report.");
  }

  // Fetch driver profile
  const driverProfile = await Driver.findOne({ userId: report.driverId._id });
  // Fetch driver car
  let car = null;
  if (report.rideId && (report.rideId as any).carId) {
    car = await Car.findById((report.rideId as any).carId);
  }
  if (!car) {
    car = await Car.findOne({ driverId: report.driverId._id });
  }

  // Count completed rides
  const completedRidesCount = await Ride.countDocuments({
    driverId: report.driverId._id,
    status: "completed",
  });

  const driverInfo = {
    name: (report.driverId as any).name,
    profileImage: (report.driverId as any).profileImage,
    rating: driverProfile?.averageRating ?? 0,
    trips: `${completedRidesCount} Trips`,
    licenseNumber: car?.licensePlate ?? "N/A",
    vehicle: car ? `${car.brand} ${car.model}`.trim() : "N/A",
  };

  // Determine current display status text based on reportStatus
  let currentStatusText = "Pending Driver Review";
  switch (report.reportStatus) {
    case REPORT_STATUS.REPORTED:
      currentStatusText = "Pending Driver Review";
      break;
    case REPORT_STATUS.UNDER_REVIEW:
      currentStatusText = "Driver Reviewing";
      break;
    case REPORT_STATUS.FOUND:
      currentStatusText = "Item Found";
      break;
    case REPORT_STATUS.NOT_FOUND:
      currentStatusText = "Item Not Found";
      break;
    case REPORT_STATUS.WAITING_PAYMENT:
      currentStatusText = "Waiting for Payment";
      break;
    case REPORT_STATUS.PAYMENT_COMPLETED:
      currentStatusText = "Payment Completed";
      break;
    case REPORT_STATUS.RETURN_SCHEDULED:
      currentStatusText = "Return Scheduled";
      break;
    case REPORT_STATUS.RETURN_IN_PROGRESS:
      currentStatusText = "Return In Progress";
      break;
    case REPORT_STATUS.RETURN_COMPLETED:
      currentStatusText = "Return Completed";
      break;
    case REPORT_STATUS.RECEIVED:
      currentStatusText = "Item Received";
      break;
    case REPORT_STATUS.CLOSED:
      currentStatusText = "Report Closed";
      break;
    case REPORT_STATUS.CANCELLED:
      currentStatusText = "Report Cancelled";
      break;
  }

  // Build the recovery timeline checkpoints
  // Let's find timestamps from auditLogs if available
  const getTimestampForAction = (action: string): Date | null => {
    const log = report.auditLogs.find((l) => l.action === action);
    return log ? log.timestamp : null;
  };

  const timeline = [
    {
      title: "Report Submitted",
      description: `Item: ${report.itemName} logged on system.`,
      status: "completed", // Always completed if the report exists
      timestamp: getTimestampForAction("REPORT_CREATED") || report.createdAt,
    },
    {
      title: "Driver Reviewing",
      description: `${driverInfo.name} is checking their vehicle coordinates.`,
      status:
        report.reportStatus === REPORT_STATUS.REPORTED
          ? "pending"
          : report.reportStatus === REPORT_STATUS.UNDER_REVIEW
          ? "active"
          : "completed",
      timestamp: getTimestampForAction("ADMIN_ACTION") || getTimestampForAction("DRIVER_FOUND") || getTimestampForAction("DRIVER_NOT_FOUND") || null,
    },
    {
      title: "Item Found / Not Found",
      description:
        report.foundStatus === FOUND_STATUS.FOUND
          ? "Item has been located by the driver."
          : report.foundStatus === FOUND_STATUS.NOT_FOUND
          ? "Driver was unable to find the item."
          : "Waiting for confirmation from driver.",
      status:
        report.foundStatus === FOUND_STATUS.PENDING
          ? "pending"
          : "completed",
      timestamp: getTimestampForAction("DRIVER_FOUND") || getTimestampForAction("DRIVER_NOT_FOUND"),
    },
    {
      title: "Return Method Selected",
      description: report.recoveryMethod
        ? `Chosen Recovery: ${report.recoveryMethod === RECOVERY_METHOD.PASSENGER_PICKUP ? "Passenger Pickup" : "Driver Delivery"}`
        : "Chosen Recovery: Pending selection",
      status: report.recoveryMethod
        ? "completed"
        : report.foundStatus === FOUND_STATUS.FOUND
        ? "active"
        : "pending",
      timestamp: getTimestampForAction("RECOVERY_SELECTED") || getTimestampForAction("PAYMENT_COMPLETED") || null,
    },
    {
      title: "Return Scheduled",
      description: report.scheduledAt
        ? `Scheduled for: ${report.scheduledAt.toLocaleString()}`
        : "Delivery or Passenger Meet schedule set.",
      status:
        [REPORT_STATUS.RETURN_SCHEDULED, REPORT_STATUS.RETURN_IN_PROGRESS, REPORT_STATUS.RETURN_COMPLETED, REPORT_STATUS.RECEIVED, REPORT_STATUS.CLOSED].includes(report.reportStatus)
          ? "completed"
          : report.recoveryMethod
          ? "active"
          : "pending",
      timestamp: report.scheduledAt || null,
    },
    {
      title: "Returned Successfully",
      description: "Safety checklist finalized and confirmed.",
      status:
        [REPORT_STATUS.RECEIVED, REPORT_STATUS.CLOSED].includes(report.reportStatus)
          ? "completed"
          : report.reportStatus === REPORT_STATUS.RETURN_COMPLETED
          ? "active"
          : "pending",
      timestamp: getTimestampForAction("PASSENGER_CONFIRMED") || null,
    },
  ];

  return {
    reportId: report._id,
    reportNumber: report.reportNumber,
    currentStatus: report.reportStatus,
    currentStatusText,
    driverInfo,
    timeline,
  };
};

export const LostAndFoundService = {
  reportLostItem,
  getMyReports,
  getReportDetails,
  confirmItemReceived,
  submitDriverRating,
  getDriverReports,
  markFound,
  markNotFound,
  configureRecovery,
  markReturned,
  createPaymentSession,
  completeLostFoundPayment,
  handleLostFoundPaymentFailed,
  getAllReports,
  adminUpdateReport,
  trackReportStatus,
};
