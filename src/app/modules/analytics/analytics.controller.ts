import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { AnalyticsService } from "./analytics.service";

const getOverview = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as any;
  const result = await AnalyticsService.getOverviewFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Overview analytics retrieved successfully",
    data: result,
  });
});

const getDriverGrowth = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as any;
  const result = await AnalyticsService.getDriverGrowthFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Driver growth analytics retrieved successfully",
    data: result,
  });
});

const getPassengerGrowth = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as any;
  const result = await AnalyticsService.getPassengerGrowthFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Passenger growth analytics retrieved successfully",
    data: result,
  });
});

const getRevenueTrend = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as any;
  const result = await AnalyticsService.getRevenueTrendFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Revenue trend analytics retrieved successfully",
    data: result,
  });
});

const getDemandByHour = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as any;
  const result = await AnalyticsService.getDemandByHourFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Demand by hour analytics retrieved successfully",
    data: result,
  });
});

const exportCsv = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as any;
  const type = query.type as string;
  let csvContent = "";
  let filename = "export.csv";

  if (type === "drivers") {
    const data = await AnalyticsService.getDriverGrowthFromDB(query);
    csvContent =
      "Month,Period,New Approved Drivers,Cumulative Drivers\n" +
      data
        .map(
          (item) =>
            `"${item.month}","${item.period}",${item.count},${item.cumulative}`,
        )
        .join("\n");
    filename = "driver_growth.csv";
  } else if (type === "passengers") {
    const data = await AnalyticsService.getPassengerGrowthFromDB(query);
    csvContent =
      "Month,Period,New Registered Passengers,Cumulative Passengers\n" +
      data
        .map(
          (item) =>
            `"${item.month}","${item.period}",${item.count},${item.cumulative}`,
        )
        .join("\n");
    filename = "passenger_growth.csv";
  } else if (type === "revenue") {
    const data = await AnalyticsService.getRevenueTrendFromDB(query);
    csvContent =
      "Date,Platform Revenue\n" +
      data.map((item) => `"${item.date}",${item.revenue}`).join("\n");
    filename = "platform_revenue.csv";
  } else if (type === "demand") {
    const data = await AnalyticsService.getDemandByHourFromDB(query);
    csvContent =
      "Hour,Label,Demand Count\n" +
      data
        .map((item) => `${item.hour},"${item.label}",${item.demand}`)
        .join("\n");
    filename = "demand_by_hour.csv";
  } else {
    const data = await AnalyticsService.getOverviewFromDB(query);
    csvContent =
      "Metric,Value\n" +
      `"Total Drivers",${data.totalDrivers}\n` +
      `"Total Passengers",${data.totalPassengers}\n` +
      `"Active Trips",${data.activeTrips}\n` +
      `"Revenue This Month",${data.revenueThisMonth}\n` +
      `"Scheduled Rides",${data.scheduledRides}\n` +
      `"Completed Trips Today",${data.completedTripsToday}\n` +
      `"Acceptance Rate (%)",${data.acceptanceRate}\n` +
      `"Completion Rate (%)",${data.completionRate}\n` +
      `"Cancellation Rate (%)",${data.cancellationRate}\n` +
      `"Active Reservations",${data.activeReservations}\n`;
    filename = "overview_analytics.csv";
  }

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  res.status(StatusCodes.OK).send(csvContent);
});

export const AnalyticsController = {
  getOverview,
  getDriverGrowth,
  getPassengerGrowth,
  getRevenueTrend,
  getDemandByHour,
  exportCsv,
};
