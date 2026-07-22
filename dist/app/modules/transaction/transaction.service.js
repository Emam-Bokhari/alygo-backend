"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const mongoose_1 = require("mongoose");
const transaction_model_1 = require("./transaction.model");
const generateTransactionId = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `TXN-${dateStr}-${randomSuffix}`;
};
const createTransaction = (data, session) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!data.transactionId) {
      data.transactionId = generateTransactionId();
    }
    const [transaction] = yield transaction_model_1.Transaction.create([data], {
      session,
    });
    return transaction;
  });
const getTransactionsByUser = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userObjectId = new mongoose_1.Types.ObjectId(userId);
    // Find transactions where the user is either the initiator (passenger) or the driver.
    return yield transaction_model_1.Transaction.find({
      $or: [{ userId: userObjectId }, { driverId: userObjectId }],
    })
      .sort({ createdAt: -1 })
      .populate("userId bookingId rideId");
  });
exports.TransactionService = {
  createTransaction,
  getTransactionsByUser,
};
