import mongoose from "mongoose";
import app from "./app";
import config from "./config";
import { errorLogger, logger } from "./shared/logger";
import colors from "colors";
import { socketHelper } from "./helpers/socketHelper";
import { Server } from "socket.io";
import seedSuperAdmin from "./DB";
import "./workers/rideMatchingWorkers";
import {
  driverAvailabilityCheckQueue,
  reservationReminderQueue,
} from "./config/bullmq";

//uncaught exception
process.on("uncaughtException", (error) => {
  errorLogger.error("uncaughtException Detected", error);
  process.exit(1);
});

let server: any;

async function main() {
  try {
    // create super admin
    seedSuperAdmin();
    // await redisClient.connect();

    mongoose.connect(config.database_url as string);
    logger.info(colors.green("🚀 Database connected successfully"));

    const port =
      typeof config.port === "number" ? config.port : Number(config.port);

    server = app.listen(port, config.ip_address as string, () => {
      logger.info(
        colors.yellow(`♻️  Application listening on port:${config.port}`),
      );
    });

    //socket
    const io = new Server(server, {
      pingTimeout: 60000,
      pingInterval: 25000,
      cors: {
        origin: "*",
      },
      transports: ["websocket", "polling"],
    });

    socketHelper.socket(io);
    //@ts-ignore
    global.io = io;

    // Schedule recurring driver availability check job (every minute)
    await driverAvailabilityCheckQueue.add(
      "driver-availability-check",
      {},
      {
        repeat: {
          every: 60000, // Run every 60 seconds (1 minute)
        },
        jobId: "recurring-driver-availability-check",
      },
    );
    logger.info(
      colors.green(
        "✅ Driver availability check job scheduled (every 1 minute)",
      ),
    );

    // Schedule recurring reservation reminder job (every minute)
    await reservationReminderQueue.add(
      "reservation-reminder-check",
      {},
      {
        repeat: {
          every: 60000, // Run every 60 seconds (1 minute)
        },
        jobId: "recurring-reservation-reminder-check",
      },
    );
    logger.info(
      colors.green("✅ Reservation reminder job scheduled (every 1 minute)"),
    );
  } catch (error) {
    errorLogger.error(colors.red("🤢 Failed to connect Database"));
  }

  //handle unhandledRejection
  process.on("unhandledRejection", (error) => {
    if (server) {
      server.close(() => {
        errorLogger.error("UnhandledRejection Detected", error);
        console.error((error as Error).stack);
        process.exit(1);
      });
    } else {
      process.exit(1);
    }
  });
}

main();

//SIGTERM
process.on("SIGTERM", () => {
  logger.info("SIGTERM IS RECEIVE");
  if (server) {
    server.close();
  }
});
