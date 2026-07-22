"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCinetPayWebhook = void 0;
const crypto_1 = require("crypto");
const verifyCinetPayWebhook = (req, res, next) => {
  var _a;
  const signature = req.headers["x-cinetpay-signature"];
  if (!signature) {
    return res.status(401).json({ message: "Missing signature" });
  }
  // Support both possible env var spellings and ensure we have a secret
  const secret =
    process.env.CINETPAY_SECRET_KEY || process.env.CINATPAY_SECRET_KEY;
  if (!secret) {
    return res
      .status(500)
      .json({ message: "Server misconfiguration: missing webhook secret" });
  }
  // Prefer raw body if available (recommended for webhook verification), otherwise fall back to JSON string
  const payload =
    (_a = req.rawBody) !== null && _a !== void 0
      ? _a
      : JSON.stringify(req.body);
  const expected = (0, crypto_1.createHmac)("sha256", secret)
    .update(payload)
    .digest("hex");
  if (signature !== expected) {
    return res.status(401).json({ message: "Invalid signature" });
  }
  next();
};
exports.verifyCinetPayWebhook = verifyCinetPayWebhook;
