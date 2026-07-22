"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_js_1 = __importDefault(require("crypto-js"));
const ENCRYPTION_SECRET_KEY = process.env.ENCRYPTION_KEY || "your-secret-key";
function encrypt(text) {
  return crypto_js_1.default.AES.encrypt(
    text,
    ENCRYPTION_SECRET_KEY,
  ).toString();
}
function decrypt(encryptedText) {
  const bytes = crypto_js_1.default.AES.decrypt(
    encryptedText,
    ENCRYPTION_SECRET_KEY,
  );
  return bytes.toString(crypto_js_1.default.enc.Utf8);
}
