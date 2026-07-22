import { ClientSession, Types } from "mongoose";
import { ITransaction } from "./transaction.interface";
import { Transaction } from "./transaction.model";
import { TRANSACTION_TYPE } from "./transaction.constant";
import { User } from "../user/user.model";
import { PAYMENT_STATUS } from "../ride/ride.constant";
import { Driver } from "../driver/driver.model";

const generateTransactionId = (): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `TXN-${dateStr}-${randomSuffix}`;
};

const createTransaction = async (
  data: Partial<ITransaction>,
  session?: ClientSession,
): Promise<ITransaction> => {
  if (!data.transactionId) {
    data.transactionId = generateTransactionId();
  }

  const [transaction] = await Transaction.create([data], { session });
  return transaction;
};

const getTransactionsByUser = async (
  userId: string,
  role?: string,
  filter: string = "all",
): Promise<any[]> => {
  const userObjectId = new Types.ObjectId(userId);
  
  // If role is not passed, attempt to retrieve it from User collection
  let userRole = role;
  if (!userRole) {
    const user = await User.findById(userId);
    userRole = user?.role || "user";
  }

  // Build the base query for User/Driver role
  const query: any = {
    paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.REFUNDED] },
  };

  if (userRole === "driver") {
    const driverProfile = await Driver.findOne({ userId: userObjectId });
    if (driverProfile) {
      query.$or = [{ userId: userObjectId }, { driverId: driverProfile._id }];
    } else {
      query.userId = userObjectId;
    }
  } else {
    // Default to "user" (passenger) logic where transactions belong directly to the passenger
    query.userId = userObjectId;
  }

  // Handle case-insensitive and variant filter values
  let normalizedFilter = "all";
  if (filter) {
    const f = filter.toLowerCase();
    if (
      f === "add_money" ||
      f === "add-money" ||
      f === "addmoney" ||
      f === "add" ||
      f === "add money"
    ) {
      normalizedFilter = "add_money";
    } else if (f === "spend") {
      normalizedFilter = "spend";
    }
  }

  if (userRole === "driver") {
    if (normalizedFilter === "add_money") {
      query.transactionType = {
        $in: [
          TRANSACTION_TYPE.BOOKING_PAYMENT,
          TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
          TRANSACTION_TYPE.DRIVER_APPRECIATION,
          TRANSACTION_TYPE.WALLET_TOPUP,
          TRANSACTION_TYPE.REFUND,
        ],
      };
    } else if (normalizedFilter === "spend") {
      query.transactionType = {
        $in: [TRANSACTION_TYPE.PAYOUT],
      };
    } else {
      // "all"
      query.transactionType = {
        $in: [
          TRANSACTION_TYPE.BOOKING_PAYMENT,
          TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
          TRANSACTION_TYPE.DRIVER_APPRECIATION,
          TRANSACTION_TYPE.WALLET_TOPUP,
          TRANSACTION_TYPE.REFUND,
          TRANSACTION_TYPE.PAYOUT,
        ],
      };
    }
  } else {
    // Default to "user" (passenger) logic
    if (normalizedFilter === "add_money") {
      query.transactionType = TRANSACTION_TYPE.WALLET_TOPUP;
    } else if (normalizedFilter === "spend") {
      query.transactionType = {
        $in: [
          TRANSACTION_TYPE.BOOKING_PAYMENT,
          TRANSACTION_TYPE.CANCELLATION_FEE,
          TRANSACTION_TYPE.DRIVER_APPRECIATION,
        ],
      };
    } else {
      // "all"
      query.transactionType = {
        $in: [
          TRANSACTION_TYPE.WALLET_TOPUP,
          TRANSACTION_TYPE.BOOKING_PAYMENT,
          TRANSACTION_TYPE.CANCELLATION_FEE,
          TRANSACTION_TYPE.DRIVER_APPRECIATION,
        ],
      };
    }
  }

  const transactions = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .populate("userId bookingId rideId");

  return transactions.map((tx) => {
    const txObj = tx.toObject();
    let flowType = "spend"; // default fallback

    const txType = txObj.transactionType;

    if (
      txType === TRANSACTION_TYPE.WALLET_TOPUP ||
      txType === TRANSACTION_TYPE.REFUND ||
      txType === TRANSACTION_TYPE.CANCELLATION_COMPENSATION
    ) {
      flowType = "add_money";
    } else if (txType === TRANSACTION_TYPE.PAYOUT) {
      flowType = "spend";
    } else if (
      txType === TRANSACTION_TYPE.BOOKING_PAYMENT ||
      txType === TRANSACTION_TYPE.DRIVER_APPRECIATION ||
      txType === TRANSACTION_TYPE.CANCELLATION_FEE
    ) {
      if (userRole === "driver") {
        flowType = "add_money";
      } else {
        flowType = "spend";
      }
    }

    return {
      ...txObj,
      type: flowType,
    };
  });
};

export const TransactionService = {
  createTransaction,
  getTransactionsByUser,
};

