import { ClientSession, Types } from "mongoose";
import { ITransaction } from "./transaction.interface";
import { Transaction } from "./transaction.model";

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
): Promise<ITransaction[]> => {
  const userObjectId = new Types.ObjectId(userId);
  // Find transactions where the user is either the initiator (passenger) or the driver.
  return await Transaction.find({
    $or: [{ userId: userObjectId }, { driverId: userObjectId }],
  })
    .sort({ createdAt: -1 })
    .populate("userId bookingId rideId");
};

export const TransactionService = {
  createTransaction,
  getTransactionsByUser,
};
