import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import { CancellationPolicy } from "./cancellationPolicy.model";
import { ICancellationPolicy } from "./cancellationPolicy.interface";
import ApiError from "../../../errors/ApiErrors";

export const CANCEL_SCENARIO_MAPPING: Record<
  string,
  { scenario: string; policyName: string }
> = {
  "passenger.beforeDriverAccepted": {
    scenario: "passenger_cancelled_before_driver_accept",
    policyName: "Passenger Cancellation Before Driver Accept",
  },
  "passenger.afterDriverAccepted": {
    scenario: "passenger_cancelled_after_driver_accept",
    policyName: "Passenger Cancellation After Driver Accept",
  },
  "passenger.afterDriverArrived": {
    scenario: "passenger_cancelled_after_driver_arrive",
    policyName: "Passenger Cancellation After Driver Arrive",
  },
  "driver.afterAccept": {
    scenario: "driver_cancelled_after_accept",
    policyName: "Driver Cancellation After Accept",
  },
  "driver.excessiveCancellation": {
    scenario: "driver_cancelled_excessive",
    policyName: "Driver Excessive Cancellation",
  },
};

const getDefaultPolicyConfig = () => ({
  passenger: {
    beforeDriverAccepted: {
      cancellationFee: 0,
      platformShare: 0,
      driverCompensation: 0,
    },
    afterDriverAccepted: {
      cancellationFee: 10,
      platformShare: 3,
      driverCompensation: 7,
    },
    afterDriverArrived: {
      cancellationFee: 15,
      platformShare: 4,
      driverCompensation: 11,
    },
  },
  driver: {
    afterAccept: { cancellationFee: 5, platformShare: 5 },
    excessiveCancellation: { cancellationFee: 20, platformShare: 20 },
    excessiveCancellationThreshold: 3,
  },
});

const getPolicyConfig = async (session?: any): Promise<any> => {
  let policy = await CancellationPolicy.findOne().session(session);
  if (
    !policy ||
    (policy as any).policyName ||
    !policy.passenger ||
    !policy.passenger.beforeDriverAccepted ||
    (policy.driver?.afterAccept as any)?.driverCompensation !== undefined
  ) {
    if (policy) {
      await CancellationPolicy.softDeleteMany({}, { session });
    }
    const [newPolicy] = await CancellationPolicy.create(
      [getDefaultPolicyConfig()],
      { session },
    );
    policy = newPolicy;
  }
  return policy;
};

const createOrUpdateCancellationPolicyToDB = async (
  payload: ICancellationPolicy,
): Promise<ICancellationPolicy> => {
  const policy = await CancellationPolicy.findOne();
  if (policy) {
    const updated = await CancellationPolicy.findByIdAndUpdate(
      policy._id,
      payload,
      { new: true },
    );
    if (!updated) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Failed to update cancellation policy",
      );
    }
    return updated;
  }

  const createCancellationPolicy = await CancellationPolicy.create(payload);
  if (!createCancellationPolicy) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Failed to create cancellation policy",
    );
  }

  return createCancellationPolicy;
};

const getActiveCancellationPolicyFromDB =
  async (): Promise<ICancellationPolicy | null> => {
    return await getPolicyConfig();
  };

const calculateCancellationFeeForRide = async (ride: any): Promise<number> => {
  try {
    const policyConfig = await getPolicyConfig();
    const isDriverAccepted = !!ride.driverId;
    const isDriverArrived = ride.status === "driver_arrived";

    let scenario: any;
    if (!isDriverAccepted) {
      scenario = policyConfig.passenger.beforeDriverAccepted;
    } else if (isDriverArrived) {
      scenario = policyConfig.passenger.afterDriverArrived;
    } else {
      scenario = policyConfig.passenger.afterDriverAccepted;
    }

    const surgeMultiplier = ride.fare?.surgeMultiplier || 1.0;
    const cancellationFee = (scenario?.cancellationFee || 0) * surgeMultiplier;

    // Check if the rider themselves is a driver (cancellation fee is 0 if so)
    let isRiderDriver = false;
    if (isDriverAccepted && ride.userId) {
      const passengerDriver = await mongoose.model("Driver").findOne({
        userId:
          typeof ride.userId === "object" && ride.userId._id
            ? ride.userId._id
            : ride.userId,
      });
      if (passengerDriver) {
        isRiderDriver = true;
      }
    }

    return isRiderDriver ? 0 : cancellationFee;
  } catch (error) {
    return 0;
  }
};

export const CancellationPolicyService = {
  getPolicyConfig,
  createOrUpdateCancellationPolicyToDB,
  getActiveCancellationPolicyFromDB,
  calculateCancellationFeeForRide,
};
