import mongoose from "mongoose";
import config from "../config";
import { ReviewServices } from "../app/modules/review/review.service";
import { Driver } from "../app/modules/driver/driver.model";

async function run() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log("Connected to MongoDB.");

    const driver = await Driver.findOne({ userId: new mongoose.Types.ObjectId("6a59af155d294c2c4111585d") });
    if (!driver) {
      console.log("Driver not found");
      return;
    }

    console.log("Running getDriverReviewSummaryFromDB for driver:", driver._id);
    const summary = await ReviewServices.getDriverReviewSummaryFromDB(driver._id.toString());
    console.log("Summary result:", JSON.stringify(summary, null, 2));

    console.log("\nRunning getMyReviewsFromDB for driver userId:", driver.userId);
    const myReviews = await ReviewServices.getMyReviewsFromDB(driver.userId.toString(), {});
    console.log("My reviews summary:", JSON.stringify(myReviews.summary, null, 2));
    console.log("My reviews length:", myReviews.reviews.length);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

run();
