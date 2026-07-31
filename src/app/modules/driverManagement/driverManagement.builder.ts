import { FilterQuery, Types } from "mongoose";
import { User } from "../user/user.model";
import { Car } from "../car/car.model";
import { IDriver } from "../driver/driver.interface";
import { USER_ROLES, STATUS } from "../../../enums/user";
import { VERIFICATION_STATUS } from "../driver/driver.constant";

export class DriverQueryBuilder {
  private queryParams: Record<string, any>;
  private filterQuery: FilterQuery<IDriver> = {};

  constructor(queryParams: Record<string, any>) {
    this.queryParams = queryParams || {};
  }

  async build(): Promise<FilterQuery<IDriver>> {
    const {
      searchTerm,
      status,
      tier,
      city,
      vehicleCategory,
      approvalStatus,
      complianceStatus,
      availability,
      fromDate,
      toDate,
    } = this.queryParams;

    // Copy unhandled parameter filters (like extraFilters passed from services)
    const queryObj = { ...this.queryParams };
    const excludeFields = [
      "searchTerm",
      "status",
      "tier",
      "city",
      "vehicleCategory",
      "approvalStatus",
      "complianceStatus",
      "availability",
      "fromDate",
      "toDate",
      "page",
      "limit",
      "sortBy",
      "sortOrder",
    ];
    excludeFields.forEach((el) => delete queryObj[el]);
    Object.assign(this.filterQuery, queryObj);

    // 1. Search term (Across User fields, Car fields, or IDs)
    if (searchTerm) {
      const term = searchTerm as string;
      const orConditions: any[] = [];

      // A. Query User model for name, email, phone match
      const matchedUsers = await User.find({
        role: USER_ROLES.DRIVER,
        $or: [
          { name: { $regex: term, $options: "i" } },
          { email: { $regex: term, $options: "i" } },
          { phone: { $regex: term, $options: "i" } },
        ],
      }).select("_id");
      const userIds = matchedUsers.map((u) => u._id);
      orConditions.push({ userId: { $in: userIds } });

      // B. Query Car model for brand, model, licensePlate match
      const matchedCars = await Car.find({
        $or: [
          { brand: { $regex: term, $options: "i" } },
          { model: { $regex: term, $options: "i" } },
          { licensePlate: { $regex: term, $options: "i" } },
        ],
      }).select("driverId");
      const driverIds = matchedCars.map((c) => c.driverId);
      orConditions.push({ _id: { $in: driverIds } });

      // C. Exact match for ObjectIds if valid
      if (Types.ObjectId.isValid(term)) {
        orConditions.push({ _id: new Types.ObjectId(term) });
        orConditions.push({ userId: new Types.ObjectId(term) });
      }

      this.filterQuery.$or = orConditions;
    }

    // 2. User Status (active, inactive)
    if (status) {
      const filteredUsers = await User.find({
        role: USER_ROLES.DRIVER,
        status: status as string,
      }).select("_id");
      const userIds = filteredUsers.map((u) => u._id);

      if (this.filterQuery.userId) {
        this.filterQuery.userId = {
          $and: [this.filterQuery.userId, { $in: userIds }],
        };
      } else {
        this.filterQuery.userId = { $in: userIds };
      }
    }

    // 3. Tier
    if (tier) {
      this.filterQuery.currentTier = new Types.ObjectId(tier as string);
    }

    // 4. City / Service Area
    if (city) {
      this.filterQuery.serviceAreaId = new Types.ObjectId(city as string);
    }

    // 5. Vehicle Category (Car Type)
    if (vehicleCategory) {
      const matchedCars = await Car.find({
        carType: { $regex: vehicleCategory as string, $options: "i" },
      }).select("driverId");
      const driverIds = matchedCars.map((c) => c.driverId);

      if (this.filterQuery._id) {
        this.filterQuery._id = {
          $and: [this.filterQuery._id, { $in: driverIds }],
        };
      } else {
        this.filterQuery._id = { $in: driverIds };
      }
    }

    // 6. Approval Status
    if (approvalStatus) {
      this.filterQuery.approvalStatus = approvalStatus;
    }

    // 7. Compliance Status
    if (complianceStatus) {
      const now = new Date();
      const thirtyDaysLater = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000,
      );

      if (complianceStatus === "expired") {
        this.filterQuery.licenseExpiryDate = { $lte: now };
      } else if (complianceStatus === "expiring_soon") {
        this.filterQuery.licenseExpiryDate = {
          $gt: now,
          $lte: thirtyDaysLater,
        };
      } else if (complianceStatus === "pending") {
        const complianceOr: any[] = [
          { taxVerificationStatus: VERIFICATION_STATUS.PENDING },
          { backgroundCheckStatus: VERIFICATION_STATUS.PENDING },
          { identityVerificationStatus: VERIFICATION_STATUS.PENDING },
        ];
        if (this.filterQuery.$or) {
          this.filterQuery.$and = this.filterQuery.$and || [];
          this.filterQuery.$and.push({ $or: complianceOr });
        } else {
          this.filterQuery.$or = complianceOr;
        }
      } else if (
        complianceStatus === "rejected" ||
        complianceStatus === "failed"
      ) {
        const complianceOr: any[] = [
          { taxVerificationStatus: VERIFICATION_STATUS.REJECTED },
          { backgroundCheckStatus: VERIFICATION_STATUS.REJECTED },
          { identityVerificationStatus: VERIFICATION_STATUS.REJECTED },
        ];
        if (this.filterQuery.$or) {
          this.filterQuery.$and = this.filterQuery.$and || [];
          this.filterQuery.$and.push({ $or: complianceOr });
        } else {
          this.filterQuery.$or = complianceOr;
        }
      } else if (complianceStatus === "verified") {
        this.filterQuery.taxVerificationStatus = VERIFICATION_STATUS.VERIFIED;
        this.filterQuery.backgroundCheckStatus = VERIFICATION_STATUS.VERIFIED;
        this.filterQuery.identityVerificationStatus =
          VERIFICATION_STATUS.VERIFIED;

        const expiryOr = [
          { licenseExpiryDate: null },
          { licenseExpiryDate: { $gt: now } },
        ];
        if (this.filterQuery.$or) {
          this.filterQuery.$and = this.filterQuery.$and || [];
          this.filterQuery.$and.push({ $or: expiryOr });
        } else {
          this.filterQuery.$or = expiryOr;
        }
      }
    }

    // 8. Availability status
    if (availability) {
      this.filterQuery.driverAvailabilityStatus = availability;
    }

    // 9. Date Range
    if (fromDate || toDate) {
      const dateRange: Record<string, any> = {};
      if (fromDate) dateRange.$gte = new Date(fromDate as string);
      if (toDate) dateRange.$lte = new Date(toDate as string);
      (this.filterQuery as any).createdAt = dateRange;
    }

    return this.filterQuery;
  }

  getSort() {
    const { sortBy, sortOrder } = this.queryParams;
    const order = sortOrder === "asc" ? 1 : -1;
    const sortField = (sortBy as string) || "createdAt";
    return { [sortField]: order } as any;
  }

  getPagination() {
    const page = Number(this.queryParams.page) || 1;
    const limit = Number(this.queryParams.limit) || 10;
    const skip = (page - 1) * limit;
    return { page, limit, skip };
  }
}
