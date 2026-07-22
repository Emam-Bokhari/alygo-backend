import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { RideServices } from "./ride.service";
import { PendingPayment } from "../pendingPayment/pendingPayment.model";
import config from "../../../config";

const estimateFareAndRoute = catchAsync(async (req: Request, res: Response) => {
  const result = await RideServices.estimateFareAndRoute(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Fare and route estimation calculated successfully",
    data: result,
  });
});

const requestRide = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await RideServices.requestRide(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Ride request initiated successfully",
    data: result,
  });
});

const acceptRide = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user.id;
  const { id: rideId } = req.params;
  const result = await RideServices.acceptRide(driverUserId, rideId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ride request accepted successfully",
    data: result,
  });
});

const arriveAtPickup = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user.id;
  const { id: rideId } = req.params;
  const result = await RideServices.arriveAtPickup(driverUserId, rideId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Driver arrival confirmed",
    data: result,
  });
});

const requestStartVerification = catchAsync(
  async (req: Request, res: Response) => {
    const driverUserId = req.user.id;
    const { id: rideId } = req.params;
    const result = await RideServices.requestStartVerification(
      driverUserId,
      rideId,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Start verification OTP sent to passenger",
      data: result,
    });
  },
);

const verifyStart = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user.id;
  const { id: rideId } = req.params;
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
  const result = await RideServices.startRide(
    driverUserId,
    rideId,
    req.body,
    ipAddress,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ride started successfully",
    data: result,
  });
});

const requestEndVerification = catchAsync(
  async (req: Request, res: Response) => {
    const driverUserId = req.user.id;
    const { id: rideId } = req.params;
    const result = await RideServices.requestEndVerification(
      driverUserId,
      rideId,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "End verification OTP sent to passenger",
      data: result,
    });
  },
);

const verifyEnd = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user.id;
  const { id: rideId } = req.params;
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
  const result = await RideServices.completeRide(
    driverUserId,
    rideId,
    req.body,
    ipAddress,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ride completed successfully",
    data: result,
  });
});

const confirmCashPayment = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user.id;
  const { id: rideId } = req.params;
  const result = await RideServices.confirmCashPayment(driverUserId, rideId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Cash payment confirmation registered successfully",
    data: result,
  });
});

const cancelRide = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const role = req.user.role;
  const { id: rideId } = req.params;
  const result = await RideServices.cancelRide(userId, role, rideId, req.body);

  const cancellation = result.cancellation;
  if (
    cancellation &&
    typeof cancellation.cancellationFee === "number" &&
    cancellation.cancellationFee > 0
  ) {
    const pendingPayment = await PendingPayment.findOne({
      rideId: (result as any)._id,
      status: "pending",
    });

    if (pendingPayment) {
      return sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Ride cancelled successfully",
        data: {
          ride: result,
          payment: {
            required: true,
            status: "pending",
            pendingPaymentId: pendingPayment._id.toString(),
            amount: pendingPayment.amount,
            currency: config.stripe.currency?.toUpperCase() || "USD",
            options: ["pay_now", "pay_later"],
          },
        },
      });
    }
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ride cancelled successfully",
    data: result,
  });
});

const getRideDetails = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { id: rideId } = req.params;
  const result = await RideServices.getRideDetails(userId, rideId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Ride details retrieved successfully",
    data: result,
  });
});

const getActiveRide = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const role = req.user.role;
  const result = await RideServices.getActiveRide(userId, role);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result ? "Active ride found" : "No active ride found",
    data: result,
  });
});

const addStops = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { id: rideId } = req.params;
  const result = await RideServices.addStopsDuringTrip(
    userId,
    rideId,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Stops added successfully. Route and fare have been updated.",
    data: result,
  });
});

const getDriverRideHistory = catchAsync(async (req: Request, res: Response) => {
  const driverUserId = req.user.id;
  const result = await RideServices.getDriverRideHistory(
    driverUserId,
    req.query,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Driver ride history retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getDriverRideHistoryDetails = catchAsync(
  async (req: Request, res: Response) => {
    const driverUserId = req.user.id;
    const { id: rideId } = req.params;
    const result = await RideServices.getDriverRideHistoryDetails(
      driverUserId,
      rideId,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Driver ride history details retrieved successfully",
      data: result,
    });
  },
);

const getUserRideHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await RideServices.getUserRideHistory(userId, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User ride history retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getUserRideHistoryDetails = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const { id: rideId } = req.params;
    const result = await RideServices.getUserRideHistoryDetails(userId, rideId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "User ride history details retrieved successfully",
      data: result,
    });
  },
);

const getMyReservations = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await RideServices.getMyReservations(userId, req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "My reservations retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getReservationDetails = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { id: rideId } = req.params;
  const result = await RideServices.getReservationDetails(userId, rideId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Reservation details retrieved successfully",
    data: result,
  });
});

export const RideController = {
  estimateFareAndRoute,
  requestRide,
  acceptRide,
  arriveAtPickup,
  requestStartVerification,
  verifyStart,
  requestEndVerification,
  verifyEnd,
  confirmCashPayment,
  cancelRide,
  getRideDetails,
  getActiveRide,
  addStops,
  getDriverRideHistory,
  getDriverRideHistoryDetails,
  getUserRideHistory,
  getUserRideHistoryDetails,
  getMyReservations,
  getReservationDetails,
};
