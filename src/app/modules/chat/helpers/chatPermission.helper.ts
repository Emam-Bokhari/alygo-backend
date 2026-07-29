import { Types } from "mongoose";
import { User } from "../../user/user.model";
import { Driver } from "../../driver/driver.model";
import { Ride } from "../../ride/ride.model";
import { LostFound } from "../../lostAndFound/lostAndFound.model";
import { Support } from "../../support/support.model";
import { CHAT_COMMUNICATION_TYPE } from "../../../../enums/chat";
import { STATUS } from "../../../../enums/user";
import { RIDE_STATUS } from "../../ride/ride.constant";

export interface IChatPermissionResult {
  allowed: boolean;
  reason: string;
}

/**
 * Centrally validates if chat communication is allowed between sender and receiver.
 */
export const checkChatPermission = async (
  senderId: string | Types.ObjectId,
  receiverId: string | Types.ObjectId,
  communicationType: CHAT_COMMUNICATION_TYPE,
  referenceId?: string | Types.ObjectId,
): Promise<IChatPermissionResult> => {
  const sender = await User.findById(senderId);
  const receiver = await User.findById(receiverId);

  // 1. Verify user exists
  if (!sender) {
    return { allowed: false, reason: "Sender user account not found." };
  }
  if (!receiver) {
    return { allowed: false, reason: "Receiver user account not found." };
  }

  // 2. Verify blocked status (User status)
  if (sender.status === STATUS.INACTIVE) {
    return {
      allowed: false,
      reason: "Sender is currently suspended or inactive.",
    };
  }
  if (receiver.status === STATUS.INACTIVE) {
    return { allowed: false, reason: "Receiver user is blocked or suspended." };
  }

  // 3. Verify driver blocked status if applicable
  if (sender.role === "driver") {
    const driver = await Driver.findOne({ userId: sender._id });
    if (
      driver?.availability?.blockedUntil &&
      new Date(driver.availability.blockedUntil) > new Date()
    ) {
      return {
        allowed: false,
        reason: `Sender is blocked from duty policy: ${driver.availability.blockedReason || "Suspended"}`,
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

  // 4. Contextual/Reference Validations
  switch (communicationType) {
    case CHAT_COMMUNICATION_TYPE.REGULAR_RIDE:
    case CHAT_COMMUNICATION_TYPE.SCHEDULED_RIDE:
    case CHAT_COMMUNICATION_TYPE.RESERVATION: {
      if (!referenceId) {
        return { allowed: false, reason: "Ride reference ID is required." };
      }
      const ride = await Ride.findById(referenceId);
      if (!ride) {
        return { allowed: false, reason: "Ride reference not found." };
      }

      // Check if sender and receiver are the passenger and driver
      const isPassenger =
        ride.userId.toString() === sender._id.toString() ||
        ride.userId.toString() === receiver._id.toString();
      const isDriver =
        ride.driverId &&
        (ride.driverId.toString() === sender._id.toString() ||
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

    case CHAT_COMMUNICATION_TYPE.LOST_FOUND: {
      if (!referenceId) {
        return { allowed: false, reason: "Lost & Found reference ID is required." };
      }
      const lostFound = await LostFound.findById(referenceId);
      if (!lostFound) {
        return {
          allowed: false,
          reason: "Lost & Found item reference not found.",
        };
      }

      // Check if sender/receiver match passenger/driver
      const isPassenger =
        lostFound.passengerId.toString() === sender._id.toString() ||
        lostFound.passengerId.toString() === receiver._id.toString();
      const isDriver =
        lostFound.driverId.toString() === sender._id.toString() ||
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

    case CHAT_COMMUNICATION_TYPE.SUPPORT: {
      if (!referenceId) {
        return { allowed: false, reason: "Support ticket reference ID is required." };
      }
      const ticket = await Support.findById(referenceId);
      if (!ticket) {
        return { allowed: false, reason: "Support ticket not found." };
      }

      // One participant must be the owner of the ticket, the other must be admin/superAdmin
      const isOwner =
        ticket.userId &&
        (ticket.userId.toString() === sender._id.toString() ||
          ticket.userId.toString() === receiver._id.toString());
      const isAdmin =
        sender.role === "admin" ||
        sender.role === "superAdmin" ||
        receiver.role === "admin" ||
        receiver.role === "superAdmin";

      if (!isOwner || !isAdmin) {
        return {
          allowed: false,
          reason: "Support chat requires the ticket owner and a support agent.",
        };
      }
      break;
    }

    case CHAT_COMMUNICATION_TYPE.OTHER:
      // Other communication context, we require no special checks besides active user validation
      break;

    default:
      return { allowed: false, reason: "Invalid communication type." };
  }

  return { allowed: true, reason: "Allowed" };
};

export const chatPermissionHelper = {
  checkChatPermission,
};
