import mongoose from "mongoose";
import config from "../config";
import { Ride } from "../app/modules/ride/ride.model";
import { Transaction } from "../app/modules/transaction/transaction.model";
import { RIDE_STATUS, PAYMENT_STATUS } from "../app/modules/ride/ride.constant";
import { TRANSACTION_TYPE } from "../app/modules/transaction/transaction.constant";
import { FinancialCenterService } from "../app/modules/financialCenter/financialCenter.service";

async function run() {
  try {
    console.log("Connecting to Database:", config.database_url);
    await mongoose.connect(config.database_url as string);
    console.log("Database connected successfully.");

    console.log(
      "\n=================== 1. TESTING REVENUE API ===================",
    );
    const revenueSummary = await FinancialCenterService.getRevenueSummaryFromDB(
      {},
    );
    console.log(
      "Revenue Summary result:\n",
      JSON.stringify(revenueSummary, null, 2),
    );

    console.log(
      "\n=================== 2. COMPLETED PAID RIDES ===================",
    );
    const rides = await Ride.find({
      status: RIDE_STATUS.COMPLETED,
      "payment.status": PAYMENT_STATUS.PAID,
    }).select("bookingId fare status payment");
    console.log(`Found ${rides.length} rides:`);
    rides.forEach((r: any, idx: number) => {
      console.log(
        `Ride #${idx + 1}: ID=${r._id}, totalFare=${r.fare?.total}, commission=${r.fare?.commission}`,
      );
    });

    console.log(
      "\n=================== 3. CANCELLATION TRANSACTIONS ===================",
    );
    const txs = await Transaction.find({
      paymentStatus: PAYMENT_STATUS.PAID,
      transactionType: {
        $in: [
          TRANSACTION_TYPE.CANCELLATION_FEE,
          TRANSACTION_TYPE.CANCELLATION_COMPENSATION,
        ],
      },
    });
    console.log(`Found ${txs.length} transactions:`);
    txs.forEach((t: any, idx: number) => {
      console.log(
        `Tx #${idx + 1}: ID=${t._id}, type=${t.transactionType}, amount=${t.amount}`,
      );
    });
  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from database.");
  }
}

run();
