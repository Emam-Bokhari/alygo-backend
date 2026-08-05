import mongoose from "mongoose";
import config from "../config";
import { Driver } from "../app/modules/driver/driver.model";
import { User } from "../app/modules/user/user.model";
import { Review } from "../app/modules/review/review.model";
import { REVIEW_STATUS } from "../app/modules/review/review.constant";

async function run() {
  try {
    await mongoose.connect(config.database_url as string);
    console.log("Connected to MongoDB.");

    // --- 1. Fix Drivers ---
    console.log("Fetching drivers and calculating actual reviews stats...");
    const drivers = await Driver.find({});
    for (const driver of drivers) {
      const stats = await Review.aggregate([
        {
          $match: {
            receiverId: driver.userId,
            receiverRole: "driver",
            status: REVIEW_STATUS.ACTIVE,
          },
        },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            totalRatings: { $sum: 1 },
            averageRating: { $avg: "$rating" },
          },
        },
      ]);

      const totalReviews = stats[0]?.totalReviews || 0;
      const totalRatings = stats[0]?.totalRatings || 0;
      const averageRating = stats[0]?.averageRating
        ? Number(stats[0].averageRating.toFixed(2))
        : 0;

      console.log(`Driver ID: ${driver._id} (User: ${driver.userId}):`);
      console.log(`  Current: totalReviews: ${driver.totalReviews}, totalRatings: ${driver.totalRatings}, averageRating: ${driver.averageRating}`);
      console.log(`  Actual:  totalReviews: ${totalReviews}, totalRatings: ${totalRatings}, averageRating: ${averageRating}`);

      if (
        driver.totalReviews !== totalReviews ||
        driver.totalRatings !== totalRatings ||
        driver.averageRating !== averageRating
      ) {
        driver.totalReviews = totalReviews;
        driver.totalRatings = totalRatings;
        driver.averageRating = averageRating;
        await driver.save();
        console.log(`  -> Updated driver document successfully.`);
      } else {
        console.log(`  -> No change needed.`);
      }
    }

    // --- 2. Fix Users (Passengers) ---
    console.log("\nFetching users and calculating actual reviews stats...");
    const users = await User.find({ role: "user" });
    for (const user of users) {
      const stats = await Review.aggregate([
        {
          $match: {
            receiverId: user._id,
            receiverRole: "user",
            status: REVIEW_STATUS.ACTIVE,
          },
        },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            totalRatings: { $sum: 1 },
            averageRating: { $avg: "$rating" },
          },
        },
      ]);

      const totalReviews = stats[0]?.totalReviews || 0;
      const totalRatings = stats[0]?.totalRatings || 0;
      const averageRating = stats[0]?.averageRating
        ? Number(stats[0].averageRating.toFixed(2))
        : 0;

      if (
        user.totalReviews !== totalReviews ||
        user.totalRatings !== totalRatings ||
        user.averageRating !== averageRating
      ) {
        console.log(`User ID: ${user._id}:`);
        console.log(`  Current: totalReviews: ${user.totalReviews}, totalRatings: ${user.totalRatings}, averageRating: ${user.averageRating}`);
        console.log(`  Actual:  totalReviews: ${totalReviews}, totalRatings: ${totalRatings}, averageRating: ${averageRating}`);
        user.totalReviews = totalReviews;
        user.totalRatings = totalRatings;
        user.averageRating = averageRating;
        await user.save();
        console.log(`  -> Updated user document successfully.`);
      }
    }

    console.log("\nDone database fix successfully.");
  } catch (error) {
    console.error("Error during database correction:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

run();
