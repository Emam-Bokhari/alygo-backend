import { Types } from "mongoose";
import { User } from "../../user/user.model";
import { Driver } from "../../driver/driver.model";
import { Ride } from "../../ride/ride.model";
import { LostFound } from "../../lostAndFound/lostAndFound.model";
import { Support } from "../../support/support.model";
import { Call } from "../call.model";
import { CALL_STATUS, COMMUNICATION_TYPE } from "../call.constant";
import { STATUS } from "../../../../enums/user";
import { RIDE_STATUS } from "../../ride/ride.constant";

export interface IPermissionResult {
  allowed: boolean;
  reason: string;
}

/**
 * Centrally validates if a call is allowed between the caller and receiver under the given context.
 */
export const checkCallPermission = async (
  callerId: string | Types.ObjectId,
  receiverId: string | Types.ObjectId,
  communicationType: COMMUNICATION_TYPE,
  referenceId: string | Types.ObjectId,
): Promise<IPermissionResult> => {
  const caller = await User.findById(callerId);
  const receiver = await User.findById(receiverId);

  // 1. Verify user exists
  if (!caller) {
    return { allowed: false, reason: "Caller user account not found." };
  }

  if (!receiver) {
    return { allowed: false, reason: "Receiver user account not found." };
  }

  // 2. Verify blocked status (User status)
  if (caller.status === STATUS.INACTIVE) {
    return {
      allowed: false,
      reason: "Caller is currently suspended or blocked.",
    };
  }
  if (receiver.status === STATUS.INACTIVE) {
    return { allowed: false, reason: "Receiver user is blocked or suspended." };
  }

  // 3. Verify driver blocked status if applicable
  if (caller.role === "driver") {
    const driver = await Driver.findOne({ userId: caller._id });
    if (
      driver?.availability?.blockedUntil &&
      new Date(driver.availability.blockedUntil) > new Date()
    ) {
      return {
        allowed: false,
        reason: `Caller is blocked from duty policy: ${driver.availability.blockedReason || "Suspended"}`,
      };
    }
  }
  if (receiver.role === "driver") {
    const driver = await Driver.findOne({ userId: receiver._id });
    if (
      driver?.availability?.blockedUntil &&
      new Date(driver.availability.blockedUntil) > new Date()
    ) {
      return {
        allowed: false,
        reason: `Receiver driver is blocked: ${driver.availability.blockedReason || "Suspended"}`,
      };
    }
  }

  // 4. Duplicate active call validation
  const activeCall = await Call.findOne({
    status: {
      $in: [
        CALL_STATUS.INITIATED,
        CALL_STATUS.RINGING,
        CALL_STATUS.ACCEPTED,
        CALL_STATUS.CONNECTED,
      ],
    },
    $or: [
      { callerId: caller._id },
      { callerId: receiver._id },
      { receiverId: caller._id },
      { receiverId: receiver._id },
    ],
  });

  if (activeCall) {
    return {
      allowed: false,
      reason: "A call is already active for one of the participants.",
    };
  }

  // 5. Cooldown after rejection (Wait 60 seconds after a rejected call)
  /*
  const oneMinuteAgo = new Date(Date.now() - 60000);
  const recentRejection = await Call.findOne({
    status: CALL_STATUS.REJECTED,
    callerId: caller._id,
    receiverId: receiver._id,
    updatedAt: { $gte: oneMinuteAgo },
  });

  if (recentRejection) {
    return {
      allowed: false,
      reason: "Cooldown active. Please wait before calling again.",
    };
  }
  */

  // 6. Rate Limit (Max 10 call attempts in 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const callAttemptsCount = await Call.countDocuments({
    callerId: caller._id,
    createdAt: { $gte: fiveMinutesAgo },
  });

  if (callAttemptsCount >= 10) {
    return {
      allowed: false,
      reason: "Too many call attempts. Please try again later.",
    };
  }

  // 7. Contextual/Reference Validations
  switch (communicationType) {
    case COMMUNICATION_TYPE.REGULAR_RIDE:
    case COMMUNICATION_TYPE.SCHEDULED_RIDE:
    case COMMUNICATION_TYPE.RESERVATION: {
      const ride = await Ride.findById(referenceId);
      if (!ride) {
        return { allowed: false, reason: "Ride reference not found." };
      }

      // Check if caller and receiver are the passenger and driver
      const isPassenger =
        ride.userId.toString() === caller._id.toString() ||
        ride.userId.toString() === receiver._id.toString();
      const isDriver =
        ride.driverId &&
        (ride.driverId.toString() === caller._id.toString() ||
          ride.driverId.toString() === receiver._id.toString());

      if (!isPassenger || !isDriver) {
        return {
          allowed: false,
          reason: "Participants are not assigned to this ride.",
        };
      }

      // Check if ride is active
      const activeStatuses = [
        RIDE_STATUS.DRIVER_ACCEPTED,
        RIDE_STATUS.DRIVER_ON_THE_WAY,
        RIDE_STATUS.DRIVER_ARRIVED,
        RIDE_STATUS.STARTED,
      ];
      if (!activeStatuses.includes(ride.status as RIDE_STATUS)) {
        return {
          allowed: false,
          reason: `Communication not allowed because ride status is '${ride.status}'.`,
        };
      }
      break;
    }

    case COMMUNICATION_TYPE.LOST_FOUND: {
      const lostFound = await LostFound.findById(referenceId);
      if (!lostFound) {
        return {
          allowed: false,
          reason: "Lost & Found item reference not found.",
        };
      }

      // Check if caller/receiver match passenger/driver
      const isPassenger =
        lostFound.passengerId.toString() === caller._id.toString() ||
        lostFound.passengerId.toString() === receiver._id.toString();
      const isDriver =
        lostFound.driverId.toString() === caller._id.toString() ||
        lostFound.driverId.toString() === receiver._id.toString();

      if (!isPassenger || !isDriver) {
        return {
          allowed: false,
          reason: "Participants are not assigned to this Lost & Found report.",
        };
      }

      // Report status check (must not be closed or cancelled)
      if (
        lostFound.reportStatus === "closed" ||
        lostFound.reportStatus === "cancelled"
      ) {
        return {
          allowed: false,
          reason:
            "Communication not allowed for closed or cancelled Lost & Found reports.",
        };
      }
      break;
    }

    case COMMUNICATION_TYPE.SUPPORT: {
      const ticket = await Support.findById(referenceId);
      if (!ticket) {
        return { allowed: false, reason: "Support ticket not found." };
      }

      // One participant must be the owner of the ticket, the other must be admin/superAdmin
      const isOwner =
        ticket.userId &&
        (ticket.userId.toString() === caller._id.toString() ||
          ticket.userId.toString() === receiver._id.toString());
      const isAdmin =
        caller.role === "admin" ||
        caller.role === "superAdmin" ||
        receiver.role === "admin" ||
        receiver.role === "superAdmin";

      if (!isOwner || !isAdmin) {
        return {
          allowed: false,
          reason: "Support call requires the ticket owner and a support agent.",
        };
      }
      break;
    }

    case COMMUNICATION_TYPE.OTHER:
      // Other communication context, we require no special checks besides active user validation
      break;

    default:
      return { allowed: false, reason: "Invalid communication type." };
  }

  return { allowed: true, reason: "Allowed" };
};
export const callPermissionHelper = {
  checkCallPermission,
};
