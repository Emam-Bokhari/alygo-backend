import mongoose from "mongoose";
import config from "../config";
import { Driver } from "../app/modules/driver/driver.model";
import { Review } from "../app/modules/review/review.model";

async function run() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log("Connected to database.");

    // Find all reviews
    const reviews = await Review.find({});
    console.log("Total reviews in DB:", reviews.length);
    reviews.forEach((r, idx) => {
      console.log(`Review ${idx + 1}:`, {
        id: r._id,
        reviewerId: r.reviewerId,
        receiverId: r.receiverId,
        receiverRole: r.receiverRole,
        rating: r.rating,
        status: r.status,
      });
    });

    // Find drivers
    const drivers = await Driver.find({});
    console.log("\nTotal drivers in DB:", drivers.length);
    drivers.forEach((d) => {
      console.log(`Driver:`, {
        id: d._id,
        userId: d.userId,
        averageRating: d.averageRating,
        totalReviews: d.totalReviews,
        totalRatings: d.totalRatings,
      });
    });

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

run();
