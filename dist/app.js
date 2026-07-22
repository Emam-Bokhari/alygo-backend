"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_status_codes_1 = require("http-status-codes");
const morgan_1 = require("./shared/morgan");
const globalErrorHandler_1 = __importDefault(
  require("./app/middlewares/globalErrorHandler"),
);
const path_1 = __importDefault(require("path"));
const v2_1 = __importDefault(require("./app/routes/v2"));
const routes_1 = __importDefault(require("./app/routes"));
const stripe_controller_1 = require("./app/modules/stripe/stripe.controller");
const requestContextMiddleware_1 = require("./app/middlewares/requestContextMiddleware");
const app = (0, express_1.default)();
app.use(requestContextMiddleware_1.requestContextMiddleware);
app.set("views", path_1.default.join(__dirname, "..", "views"));
app.set("view engine", "ejs");
// morgan
app.use(morgan_1.Morgan.successHandler);
app.use(morgan_1.Morgan.errorHandler);
//body parser
app.use(
  (0, cors_1.default)({
    origin: ["http://10.10.7.46:3011", "http://10.10.7.46:3015"],
    credentials: true,
  }),
);
// Stripe Webhook Endpoint (Needs raw body parser BEFORE express.json())
app.post(
  "/api/v1/stripe/webhook",
  express_1.default.raw({ type: "application/json" }),
  (req, res, next) => {
    req.rawBody = req.body;
    next();
  },
  stripe_controller_1.StripeControllers.handleWebhook,
);
app.use(
  express_1.default.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express_1.default.urlencoded({ extended: true }));
//file retrieve
app.use(
  "/uploads",
  express_1.default.static(path_1.default.join(__dirname, "..", "uploads")),
);
//router
app.use("/api/v1", routes_1.default);
routes_1.default.use("/api/v2", v2_1.default);
app.get("/", (req, res) => {
  res.send("Server is running...");
});
// handle not found route
app.use((req, res) => {
  res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
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
app.use(globalErrorHandler_1.default);
exports.default = app;
