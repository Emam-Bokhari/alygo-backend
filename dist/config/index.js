"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), ".env") });
exports.default = {
    ip_address: process.env.IP,
    port: process.env.PORT,
    database_url: process.env.DATABASE_URL,
    node_env: process.env.NODE_ENV,
    bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
    jwt: {
        jwt_secret: process.env.JWT_SECRET,
        jwt_expire_in: process.env.JWT_EXPIRE_IN,
        jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
        jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    },
    redis_host: process.env.REDIS_HOST,
    redis_port: process.env.REDIS_PORT,
    redis_password: process.env.REDIS_PASSWORD,
    redis_db: process.env.REDIS_DB,
    start_cron: process.env.START_CRON,
    client_url: process.env.CLIENT_URL,
    // google login
    firebase: {
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
        projectId: process.env.FIREBASE_PROJECT_ID,
    },
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    stripe: {
        stripeSecretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        paymentSuccess: process.env.STRIPE_PAYMENT_SUCCESS,
        BASE_URL: process.env.BASE_URL,
        currency: process.env.CURRENCY,
    },
    payment: {
        maxDriverAppreciation: parseFloat(process.env.MAX_DRIVER_APPRECIATION || "100"),
    },
    email: {
        from: process.env.EMAIL_FROM,
        user: process.env.EMAIL_USER,
        port: process.env.EMAIL_PORT,
        host: process.env.EMAIL_HOST,
        pass: process.env.EMAIL_PASS,
    },
    support_receiver_email: process.env.SUPPORT_RECEIVER_EMAIL,
    admin: {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
    },
    afrikSms: {
        clientId: process.env.AFRIKSMS_CLIENT_ID,
        apiKey: process.env.AFRIKSMS_API_KEY,
        senderId: process.env.AFRIKSMS_SENDER_ID || "AFRIKSMS",
        callbackUrl: process.env.AFRIKSMS_CALLBACK_URL,
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        serviceSid: process.env.TWILIO_SERVICE_SID,
    },
    driverMatching: {
        initialSearchRadiusKm: parseFloat(process.env.INITIAL_SEARCH_RADIUS_KM || "5"),
        radiusExpansionDistanceKm: parseFloat(process.env.RADIUS_EXPANSION_DISTANCE_KM || "3"),
        driverVisibilityDurationSeconds: parseInt(process.env.DRIVER_VISIBILITY_DURATION_SECONDS || "60"),
        rideRequestLifetimeSeconds: parseInt(process.env.RIDE_REQUEST_LIFETIME_SECONDS || "300"),
        maxSearchRadiusKm: parseFloat(process.env.MAX_SEARCH_RADIUS_KM || "50"),
    },
    tracking: {
        // Driver location update settings
        minLocationUpdateIntervalSeconds: parseInt(process.env.MIN_LOCATION_UPDATE_INTERVAL_SECONDS || "2"),
        minMovementDistanceMeters: parseFloat(process.env.MIN_MOVEMENT_DISTANCE_METERS || "10"),
        maxGpsAccuracyToleranceMeters: parseFloat(process.env.MAX_GPS_ACCURACY_TOLERANCE_METERS || "50"),
        // Driver arrival detection
        arrivalRadiusMeters: parseFloat(process.env.ARRIVAL_RADIUS_METERS || "30"),
        // ETA calculation
        etaRefreshIntervalSeconds: parseInt(process.env.ETA_REFRESH_INTERVAL_SECONDS || "10"),
        averageSpeedKmh: parseFloat(process.env.AVERAGE_SPEED_KMH || "40"),
        // Socket optimization
        enableSocketOptimization: process.env.ENABLE_SOCKET_OPTIMIZATION !== "false",
    },
    reservation: {
        enabled: process.env.RESERVATION_ENABLED !== "false",
        minAdvanceMinutes: parseInt(process.env.RESERVATION_MIN_ADVANCE_MINUTES || "30"),
        maxAdvanceDays: parseInt(process.env.RESERVATION_MAX_ADVANCE_DAYS || "30"),
        driverVisibleBeforeMinutes: parseInt(process.env.RESERVATION_DRIVER_VISIBLE_BEFORE_MINUTES || "60"),
        driverAssignmentTimeoutMinutes: parseInt(process.env.RESERVATION_DRIVER_ASSIGNMENT_TIMEOUT_MINUTES || "5"),
        reminder24h: process.env.RESERVATION_REMINDER_24H !== "false",
        reminder1h: process.env.RESERVATION_REMINDER_1H !== "false",
        reminder30m: process.env.RESERVATION_REMINDER_30M !== "false",
        reminder15m: process.env.RESERVATION_REMINDER_15M !== "false",
    },
};
