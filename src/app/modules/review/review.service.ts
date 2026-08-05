import { IReview } from "./review.interface";
import { Review } from "./review.model";
import { Ride } from "../ride/ride.model";
import { User } from "../user/user.model";
import { Driver } from "../driver/driver.model";
import { Car } from "../car/car.model";
import { PendingPayment } from "../pendingPayment/pendingPayment.model";
import { PendingPaymentService } from "../pendingPayment/pendingPayment.service";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import mongoose, { Types } from "mongoose";
import { REVIEW_STATUS } from "./review.constant";
import { RIDE_STATUS } from "../ride/ride.constant";
import { PointsService } from "../tier/points.service";
import { POINT_EVENT_TYPE } from "../tier/tier.constant";
import QueryBuilder from "../../builder/queryBuilder";

/**
 * Submit a rating & review for a completed ride.
 */
const createReviewInDB = async (
  reviewerId: string,
  reviewerRole: "user" | "driver",
  rideId: string,
  payload: {
    rating: number;
    reviewText?: string;
    selectedTags?: string;
    appreciation?: number;
    paymentMethod?: "stripe" | "wallet" | "skip";
  },
) => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Ride not found");
  }

  // 1. Validate ride is COMPLETED
  if (ride.status !== RIDE_STATUS.COMPLETED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cannot review a ride with status: ${ride.status}. Only completed rides can be reviewed.`,
    );
  }

  // 2. Validate reviewer participation and determine receiver
  let receiverId: Types.ObjectId;
  let receiverRole: "user" | "driver";

  if (reviewerRole === "user") {
    if (ride.userId.toString() !== reviewerId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You did not participate in this ride as a passenger.",
      );
    }
    if (!ride.driverId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Ride does not have an assigned driver.",
      );
    }
    receiverId = ride.driverId;
    receiverRole = "driver";
  } else {
    // Driver role
    if (!ride.driverId || ride.driverId.toString() !== reviewerId) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "You did not participate in this ride as a driver.",
      );
    }
    receiverId = ride.userId;
    receiverRole = "user";
  }

  // Prevent self-review (redundant sanity check)
  if (reviewerId === receiverId.toString()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You cannot submit a review for yourself.",
    );
  }

  // 3. Ensure reviewer has not already reviewed this ride
  const existingReview = await Review.findOne({
    rideId: new Types.ObjectId(rideId),
    reviewerId: new Types.ObjectId(reviewerId),
  });

  if (existingReview) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "You have already submitted a review for this ride.",
    );
  }

  // 4. Fetch Driver Name and Car/Vehicle Info for Snapshot
  let driverName = "Unknown Driver";
  const driverUser = await User.findById(ride.driverId);
  if (driverUser) {
    driverName = driverUser.name;
  }

  let vehicleName = "Unknown Vehicle";
  let vehicleNumber = "Unknown License Plate";
  if (ride.carId) {
    const car = await Car.findById(ride.carId);
    if (car) {
      vehicleName = `${car.brand} ${car.model}`.trim();
      vehicleNumber = car.licensePlate;
    }
  }

  const { rating, reviewText, selectedTags, appreciation } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 5. Create immutable ride snapshot and save Review
    const reviewData: Partial<IReview> = {
      rideId: new Types.ObjectId(rideId),
      reviewerId: new Types.ObjectId(reviewerId),
      reviewerRole,
      receiverId,
      receiverRole,
      rating,
      reviewText: reviewText ? reviewText.trim() : "",
      selectedTags: selectedTags || "",
      appreciation: reviewerRole === "user" ? appreciation || 0 : 0,
      status: REVIEW_STATUS.ACTIVE,
      rideSnapshot: {
        driverName,
        vehicleName,
        vehicleNumber,
        completedAt: ride.completedAt || new Date(),
        rideCategory: ride.rideCategory.name,
        pickup: ride.pickup.address,
        destination: ride.destination.address,
        fare: ride.fare.total,
      },
      reviewForId: receiverId,
      reviewById: new Types.ObjectId(reviewerId),
    };

    const [review] = await Review.create([reviewData], { session });

    // 6. Recalculate and update receiver's rating statistics based on actual reviews in database
    if (receiverRole === "user") {
      const stats = await Review.aggregate([
        {
          $match: {
            receiverId: new Types.ObjectId(receiverId.toString()),
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
      ]).session(session);

      const totalReviews = stats[0]?.totalReviews || 0;
      const totalRatings = stats[0]?.totalRatings || 0;
      const averageRating = stats[0]?.averageRating
        ? Number(stats[0].averageRating.toFixed(2))
        : 0;

      await User.findByIdAndUpdate(
        receiverId,
        {
          totalReviews,
          totalRatings,
          averageRating,
        },
        { session },
      );
    } else if (receiverRole === "driver") {
      const stats = await Review.aggregate([
        {
          $match: {
            receiverId: new Types.ObjectId(receiverId.toString()),
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
      ]).session(session);

      const totalReviews = stats[0]?.totalReviews || 0;
      const totalRatings = stats[0]?.totalRatings || 0;
      const averageRating = stats[0]?.averageRating
        ? Number(stats[0].averageRating.toFixed(2))
        : 0;

      const driver = await Driver.findOneAndUpdate(
        { userId: new Types.ObjectId(receiverId.toString()) },
        {
          totalReviews,
          totalRatings,
          averageRating,
        },
        { session, new: true },
      );

      if (driver) {
        // Award points if passenger left a 5-star rating for driver
        if (rating === 5) {
          PointsService.awardPoints(
            receiverId,
            POINT_EVENT_TYPE.FIVE_STAR_RATING,
            "review",
            review._id,
            {
              notes: `5-Star Rating received for Ride ${rideId}`,
              session,
              rideId: rideId,
            },
          ).catch((err) => console.error("Error awarding rating points:", err));
        }
      }
    }

    // 7. If passenger has driver appreciation amount > 0, handle payment
    let pendingPaymentDoc = null;
    let paymentResult = null;

    if (reviewerRole === "user" && appreciation && appreciation > 0) {
      const driverProfile = await Driver.findOne({
        userId: receiverId,
      }).session(session);
      if (!driverProfile) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Driver profile not found");
      }

      const [newPendingPayment] = await PendingPayment.create(
        [
          {
            userId: new Types.ObjectId(reviewerId),
            rideId: new Types.ObjectId(rideId),
            driverId: driverProfile._id,
            type: "driver_appreciation",
            amount: appreciation,
            status: "pending",
          },
        ],
        { session },
      );
      pendingPaymentDoc = newPendingPayment;

      // Handle immediate payment based on paymentMethod
      if (payload.paymentMethod === "skip") {
        // Skip payment - void it immediately
        pendingPaymentDoc.status = "voided";
        await pendingPaymentDoc.save({ session });
      } else if (payload.paymentMethod === "wallet") {
        // Pay immediately with wallet
        await session.commitTransaction();
        session.endSession();

        const paidPayment =
          await PendingPaymentService.payCancellationFeeWithWallet(
            reviewerId,
            pendingPaymentDoc._id.toString(),
          );
        paymentResult = { method: "wallet", status: "paid", data: paidPayment };

        return { review, pendingPayment: paidPayment, paymentResult };
      } else if (payload.paymentMethod === "stripe") {
        // Create stripe checkout session
        await session.commitTransaction();
        session.endSession();

        const stripeResult = await PendingPaymentService.payCancellationFeeNow(
          reviewerId,
          pendingPaymentDoc._id.toString(),
        );
        paymentResult = {
          method: "stripe",
          status: "pending_payment",
          data: stripeResult,
        };

        return { review, pendingPayment: pendingPaymentDoc, paymentResult };
      }
      // If no paymentMethod provided, keep pending payment for later payment
    }

    await session.commitTransaction();
    session.endSession();

    return { review, pendingPayment: pendingPaymentDoc, paymentResult };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

/**
 * Get reviews received by a driver.
 */
const getDriverReviewsFromDB = async (driverId: string) => {
  let driver = await Driver.findById(driverId);
  if (!driver) {
    driver = await Driver.findOne({ userId: new Types.ObjectId(driverId) });
  }
  if (!driver) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Driver profile not found");
  }

  return await Review.find({
    receiverId: driver.userId,
    receiverRole: "driver",
  })
    .populate("reviewerId", "name email profileImage")
    .sort({ createdAt: -1 });
};

/**
 * Get reviews received by a passenger.
 */
const getUserReviewsFromDB = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User profile not found");
  }

  return await Review.find({
    receiverId: user._id,
    receiverRole: "user",
  })
    .populate("reviewerId", "name email profileImage")
    .sort({ createdAt: -1 });
};

/**
 * Get review and appreciation statistics summary for a driver.
 */
const getDriverReviewSummaryFromDB = async (driverId: string) => {
  let driver = await Driver.findById(driverId);
  if (!driver) {
    driver = await Driver.findOne({ userId: new Types.ObjectId(driverId) });
  }
  if (!driver) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Driver profile not found");
  }

  // Calculate rating distribution dynamically
  const starAggregation = await Review.aggregate([
    {
      $match: {
        receiverId: driver.userId,
        receiverRole: "driver",
        status: REVIEW_STATUS.ACTIVE,
      },
    },
    {
      $group: {
        _id: "$rating",
        count: { $sum: 1 },
      },
    },
  ]);

  const ratingDistribution = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };

  let totalReviews = 0;
  let totalRatingSum = 0;

  starAggregation.forEach((item) => {
    const star = item._id.toString();
    if (star in ratingDistribution) {
      const count = item.count;
      ratingDistribution[star as keyof typeof ratingDistribution] = count;
      totalReviews += count;
      totalRatingSum += Number(item._id) * count;
    }
  });

  const averageRating =
    totalReviews > 0 ? Number((totalRatingSum / totalReviews).toFixed(2)) : 0;

  return {
    averageRating,
    totalReviews,
    ratingDistribution,
    totalAppreciation: driver.totalAppreciationAmount || 0,
    averageAppreciation: driver.averageAppreciation || 0,
  };
};

/**
 * Get paginated and filtered reviews for the current authenticated driver.
 */
const getMyReviewsFromDB = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const driver = await Driver.findOne({ userId: new Types.ObjectId(userId) });
  if (!driver) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Driver profile not found");
  }

  const filterObj: Record<string, any> = {
    receiverId: driver.userId,
    receiverRole: "driver",
  };

  // Rating Filter
  if (query.rating) {
    filterObj.rating = Number(query.rating);
  }

  // Date Filter
  if (query.fromDate || query.toDate) {
    filterObj.createdAt = {};
    if (query.fromDate) {
      filterObj.createdAt.$gte = new Date(query.fromDate as string);
    }
    if (query.toDate) {
      filterObj.createdAt.$lte = new Date(query.toDate as string);
    }
  }

  // Search by Passenger Name
  if (query.searchTerm) {
    const matchingUsers = await User.find({
      role: "user",
      name: { $regex: query.searchTerm as string, $options: "i" },
    }).select("_id");

    const matchingUserIds = matchingUsers.map((u) => u._id);
    filterObj.reviewerId = { $in: matchingUserIds };
  }

  const cleanQuery = { ...query };
  delete cleanQuery.rating;
  delete cleanQuery.fromDate;
  delete cleanQuery.toDate;
  delete cleanQuery.searchTerm;

  const baseQuery = Review.find(filterObj).populate({
    path: "reviewerId",
    select: "name profileImage",
  });

  const queryBuilder = new QueryBuilder(baseQuery, cleanQuery)
    .filter()
    .sort()
    .paginate()
    .fields();

  const data = await queryBuilder.modelQuery;
  const meta = await queryBuilder.countTotal();

  const reviews = data.map((review: any) => ({
    _id: review._id,
    passenger: {
      _id: review.reviewerId?._id || null,
      name: review.reviewerId?.name || "Unknown Passenger",
      profileImage: review.reviewerId?.profileImage || "",
    },
    rating: review.rating,
    comment: review.reviewText || "",
    createdAt: review.createdAt,
    rideId: review.rideId,
  }));

  // Calculate rating stats dynamically
  const ratingStats = await Review.aggregate([
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
        averageRating: { $avg: "$rating" },
      },
    },
  ]);

  const totalReviewsCount = ratingStats[0]?.totalReviews || 0;
  const averageRatingVal = ratingStats[0]?.averageRating
    ? Number(ratingStats[0].averageRating.toFixed(2))
    : 0;

  const summary = {
    averageRating: averageRatingVal,
    totalReviews: totalReviewsCount,
  };

  return {
    summary,
    reviews,
    pagination: meta,
  };
};

export const ReviewServices = {
  createReviewInDB,
  getDriverReviewsFromDB,
  getUserReviewsFromDB,
  getDriverReviewSummaryFromDB,
  getMyReviewsFromDB,
};
