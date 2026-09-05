import express, { Application, Request, Response } from "express";
import cors from "cors";
import { StatusCodes } from "http-status-codes";
import { Morgan } from "./shared/morgan";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import path from "path";
import v2Router from "./app/routes/v2";
import swaggerUi from "swagger-ui-express";
import yaml from "yamljs";
import router from "./app/routes";
import { StripeControllers } from "./app/modules/stripe/stripe.controller";
import { requestContextMiddleware } from "./app/middlewares/requestContextMiddleware";

const app: Application = express();

app.use(requestContextMiddleware);

app.set("views", path.join(__dirname, "..", "views"));
app.set("view engine", "ejs");

// morgan
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

// Private Network Access (PNA) - must be before cors to ensure it is added to preflight OPTIONS responses
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Private-Network", "true");
  next();
});

const corsOptions: cors.CorsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Stripe Webhook Endpoint (Needs raw body parser BEFORE express.json())
app.post(
  "/api/v1/stripe/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    (req as any).rawBody = req.body;
    next();
  },
  StripeControllers.handleWebhook,
);

app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: true }));

//file retrieve
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// swagger docs
const swaggerDocument = yaml.load(
  path.join(__dirname, "..", "docs", "swagger", "index.yaml"),
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//router
app.use("/api/v1", router);
router.use("/api/v2", v2Router);

app.get("/", (req: Request, res: Response) => {
  res.send("Server is running...");
});

// Socket Monitor and Diagnostic Web Views
app.get("/driver-monitor", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "driver-socket-monitor.html"));
});
app.get("/passenger-monitor", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "passenger-socket-monitor.html"));
});
app.get("/diagnostics-monitor", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "driver-location-update.html"));
});

// handle not found route
app.use((req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: "Not Found",
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API DOESN'T EXIST",
      },
    ],
  });
});

//global error handle
app.use(globalErrorHandler);

export default app;
