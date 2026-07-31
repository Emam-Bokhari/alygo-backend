import { Types } from "mongoose";
import { DRIVER_STATUS } from "../../../enums/user";

export interface IDriverQueryFilters {
  page?: string;
  limit?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: string; // active, inactive
  tier?: string;
  city?: string; // serviceAreaId
  vehicleCategory?: string; // carType
  approvalStatus?: DRIVER_STATUS;
  complianceStatus?: "expired" | "expiring_soon" | "pending" | "failed";
  availability?: string;
  fromDate?: string;
  toDate?: string;
}

export interface IDriverOverviewSummary {
  totalDrivers: number;
  onlineDrivers: number;
  pendingApproval: number;
  suspendedDrivers: number;
  compliancePending: number;
  complianceExpired: number;
  verifiedDrivers: number;
  activeTiers: Array<{
    tierId: Types.ObjectId | string | null;
    name: string;
    count: number;
  }>;
}
