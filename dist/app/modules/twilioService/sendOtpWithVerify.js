"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.twilioService = void 0;
const http_status_codes_1 = require("http-status-codes");
const twilio_1 = __importDefault(require("twilio"));
const config_1 = __importDefault(require("../../../config"));
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
class TwilioService {
  constructor() {
    const accountSid = config_1.default.twilio.accountSid;
    const authToken = config_1.default.twilio.authToken;
    // Initialize Twilio client
    this.client = (0, twilio_1.default)(accountSid, authToken);
    // Configure country codes
    this.phoneConfig = {
      defaultCountryCode: "+880", // Bangladesh default
      countryCodes: [
        "+1", // USA/Canada
        "+44", // UK
        "+91", // India
        "+880", // Bangladesh
        "+92", // Pakistan
        "+966", // Saudi Arabia
        "+971", // UAE
        "+60", // Malaysia
        "+65", // Singapore
        "+86", // China
        "+81", // Japan
        "+82", // South Korea
      ],
    };
  }
  // ✅ Format phone number to E.164 format
  formatPhoneNumber(phoneNumber, countryCode) {
    let phone = phoneNumber.trim().replace(/\s+/g, ""); // Remove spaces
    // If already in E.164 format (starts with +), validate and return
    if (phone.startsWith("+")) {
      const isValid = this.phoneConfig.countryCodes.some((code) =>
        phone.startsWith(code),
      );
      if (isValid) {
        return phone;
      } else {
        throw new ApiErrors_1.default(
          http_status_codes_1.StatusCodes.BAD_REQUEST,
          "Invalid country code in phone number",
        );
      }
    }
    // Use provided country code or default
    const code = countryCode || this.phoneConfig.defaultCountryCode;
    // Validate provided country code
    if (!this.phoneConfig.countryCodes.includes(code)) {
      throw new ApiErrors_1.default(
        http_status_codes_1.StatusCodes.BAD_REQUEST,
        `Invalid country code: ${code}`,
      );
    }
    // Remove leading 0 if exists (common in local formats)
    if (phone.startsWith("0")) {
      phone = phone.substring(1);
    }
    // Combine country code with phone number
    return `${code}${phone}`;
  }
  // Using Twilio Verify API
  sendOTPWithVerify(phoneNumber, countryCode) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Format phone number to E.164
        const formattedPhone = this.formatPhoneNumber(phoneNumber, countryCode);
        console.log("Original phone:", phoneNumber);
        console.log("Country code:", countryCode);
        console.log("Formatted phone:", formattedPhone);
        console.log("Service SID:", config_1.default.twilio.serviceSid);
        const verification = yield this.client.verify.v2
          .services(config_1.default.twilio.serviceSid)
          .verifications.create({
            to: formattedPhone,
            channel: "sms",
          });
        console.log("Verification:", verification);
        console.log(`OTP sent to ${formattedPhone}: ${verification.sid}`);
      } catch (error) {
        console.error("Twilio Error Details:", {
          message: error.message,
          code: error.code,
          status: error.status,
          moreInfo: error.moreInfo,
        });
        throw new ApiErrors_1.default(
          http_status_codes_1.StatusCodes.EXPECTATION_FAILED,
          `Failed to send verification code: ${error.message}`,
        );
      }
    });
  }
  // Verify the OTP
  verifyOTP(phoneNumber, code, countryCode) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        // Format phone number to E.164
        const formattedPhone = this.formatPhoneNumber(phoneNumber, countryCode);
        console.log("Verifying OTP for:", formattedPhone);
        console.log("Code:", code);
        const verification = yield this.client.verify.v2
          .services(config_1.default.twilio.serviceSid)
          .verificationChecks.create({
            to: formattedPhone,
            code: code,
          });
        console.log("Verification status:", verification.status);
        return verification.status === "approved";
      } catch (error) {
        console.error("Verify Error Details:", {
          message: error.message,
          code: error.code,
          status: error.status,
        });
        throw new ApiErrors_1.default(
          http_status_codes_1.StatusCodes.EXPECTATION_FAILED,
          `Failed to verify code: ${error.message}`,
        );
      }
    });
  }
}
exports.twilioService = new TwilioService();
