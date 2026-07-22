import { StatusCodes } from "http-status-codes";
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
      await CancellationPolicy.deleteMany({}).session(session);
    }
    const [newPolicy] = await CancellationPolicy.create(
      [getDefaultPolicyConfig()],
      { session },
    );
    policy = newPolicy;
  }
  return policy;
};

const createCancellationPolicyToDB = async (
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

const getCancellationPolicyFromDB = async (
  _cancellationPolicyId: string,
): Promise<ICancellationPolicy | null> => {
  return await getPolicyConfig();
};

const getAllCancellationPolicyFromDB = async (
  _query: Record<string, unknown> = {},
) => {
  const policy = await getPolicyConfig();
  const result = policy ? [policy] : [];
  return {
    meta: {
      page: 1,
      limit: 10,
      total: result.length,
      totalPage: 1,
    },
    result,
  };
};

const getActiveCancellationPoliciesFromDB = async (
  _query: Record<string, unknown> = {},
) => {
  const policy = await getPolicyConfig();
  const result = policy ? [policy] : [];
  return {
    meta: {
      page: 1,
      limit: 10,
      total: result.length,
      totalPage: 1,
    },
    result,
  };
};

const getCancellationPolicyByActorAndTriggerFromDB = async (
  actorType: string,
  triggerType: string,
): Promise<any | null> => {
  const policy = await getPolicyConfig();
  if (!policy) return null;

  let scenario: any;
  const normalizedActor = actorType.toLowerCase();

  if (normalizedActor === "user" || normalizedActor === "passenger") {
    scenario = (policy.passenger as any)[triggerType];
  } else if (normalizedActor === "driver") {
    scenario = (policy.driver as any)[triggerType];
  }

  if (!scenario) return null;

  const actorKey = normalizedActor === "user" ? "passenger" : normalizedActor;
  const internalKey = `${actorKey}.${triggerType}`;
  const mapped = CANCEL_SCENARIO_MAPPING[internalKey] || {
    scenario: internalKey.replace(".", "_"),
    policyName: triggerType.replace(/([A-Z])/g, " $1").trim(),
  };

  return {
    _id: (policy as any)._id,
    policyName: mapped.policyName,
    scenario: mapped.scenario,
    actorType,
    triggerType,
    cancellationFee: scenario.cancellationFee,
    otherPartyCompensation: scenario.driverCompensation || 0,
    platformShare: scenario.platformShare,
    status: "ACTIVE",
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  } as any;
};

const updateCancellationPolicyToDB = async (
  _cancellationPolicyId: string,
  payload: Partial<ICancellationPolicy>,
) => {
  const policy = await getPolicyConfig();
  const updated = await CancellationPolicy.findByIdAndUpdate(
    policy._id,
    payload,
    { new: true },
  );

  if (!updated) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Cancellation policy not found");
  }

  return updated;
};

const updateCancellationPolicyStatusToDB = async (
  _cancellationPolicyId: string,
  _status: string,
) => {
  return await getPolicyConfig();
};

const deleteCancellationPolicyToDB = async (_cancellationPolicyId: string) => {
  const policy = await getPolicyConfig();
  const result = await CancellationPolicy.softDeleteById(
    (policy as any)._id.toString(),
  );
  return result;
};

export const CancellationPolicyService = {
  getPolicyConfig,
  createCancellationPolicyToDB,
  getCancellationPolicyFromDB,
  getAllCancellationPolicyFromDB,
  getActiveCancellationPoliciesFromDB,
  getCancellationPolicyByActorAndTriggerFromDB,
  updateCancellationPolicyToDB,
  deleteCancellationPolicyToDB,
  updateCancellationPolicyStatusToDB,
};
