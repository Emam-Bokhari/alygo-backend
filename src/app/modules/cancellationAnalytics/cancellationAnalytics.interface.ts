export interface ICancellationAnalyticsSummary {
  totalCancellations: number;
  passengerCancellations: number;
  driverCancellations: number;
  feesCollected: number;
  totalDriverPaid: number;
}

export interface ICancellationTrendData {
  day: string;
  cancelledRides: number;
}

export interface ICancellationReasonData {
  reason: string;
  count: number;
}

export interface ICancellationCityData {
  city: string;
  total: number;
}

export interface ICancellationCategoryData {
  category: string;
  count: number;
}

export type DateFilterType =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "custom";

export interface ICancellationAnalyticsQuery {
  startDate?: string;
  endDate?: string;
  filter?: DateFilterType;
  timezone?: string;
  serviceAreaId?: string;
  city?: string;
  rideCategoryId?: string;
  limit?: number;
}
