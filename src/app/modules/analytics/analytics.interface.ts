export interface IAnalyticsQuery {
  startDate?: string;
  endDate?: string;
  filter?:
    | "today"
    | "yesterday"
    | "last7days"
    | "last30days"
    | "thisMonth"
    | "lastMonth"
    | "thisYear"
    | "6months"
    | "12months"
    | "custom";
  timezone?: string;
  serviceAreaId?: string;
  groupBy?: "day" | "month";
  limit?: string | number;
}

export interface IDriverGrowthData {
  month: string;
  period: string;
  count: number;
  cumulative: number;
}

export interface IPassengerGrowthData {
  month: string;
  period: string;
  count: number;
  cumulative: number;
}

export interface IRevenueTrendData {
  date: string;
  revenue: number;
}

export interface IDemandByHourData {
  hour: number;
  label: string;
  demand: number;
}

export interface IOverviewData {
  totalDrivers: number;
  totalPassengers: number;
  activeTrips: number;
  revenueThisMonth: number;
  scheduledRides: number;
  completedTripsToday: number;
  acceptanceRate: number;
  completionRate: number;
  cancellationRate: number;
  activeReservations: number;
  revenueTrend: { day: string; revenue: number }[];
  demandTrend: { time: string; demand: number }[];
}
