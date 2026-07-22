"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFileData = void 0;
const fileMapper_1 = require("./fileMapper");
const ApiErrors_1 = __importDefault(require("../../errors/ApiErrors"));
// normalizer
const normalizeField = (field) => {
  var _a;
  if (typeof field === "string") {
    return { fieldName: field, mode: "auto" };
  }
  return {
    fieldName: field.fieldName,
    mode: (_a = field.mode) !== null && _a !== void 0 ? _a : "auto",
  };
};
// safe json parse (FIXED)
const safeJsonParse = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (_a) {
    throw new ApiErrors_1.default(400, "Invalid JSON in body.data");
  }
};
// auto mode resolver
const resolveMode = (mode, files) => {
  if (mode !== "auto") return mode;
  return files && files.length <= 1 ? "single" : "multiple";
};
// main middleware
const parseFileData = (...fields) => {
  const normalized = fields.map(normalizeField);
  return (req, res, next) => {
    var _a;
    try {
      const files = req.files || {};
      const fileData = {};
      for (const { fieldName, mode } of normalized) {
        const fieldFiles = files[fieldName];
        if (!fieldFiles || fieldFiles.length === 0) continue;
        const resolvedMode = resolveMode(mode, fieldFiles);
        if (fieldName === "taxDocuments" || fieldName === "insuranceHub") {
          // Special handling for taxDocuments and insuranceHub: create array of objects with fileUrl and fileName
          fileData[fieldName] = fieldFiles.map((file) => ({
            fileUrl: (0, fileMapper_1.mapFileToUrl)(file, fieldName),
            fileName: file.originalname,
            uploadedAt: new Date(),
          }));
        } else if (resolvedMode === "single") {
          fileData[fieldName] = (0, fileMapper_1.mapFileToUrl)(
            fieldFiles[0],
            fieldName,
          );
        } else {
          fileData[fieldName] = (0, fileMapper_1.mapFilesToUrls)(
            fieldFiles,
            fieldName,
          );
        }
      }
      let parsedBody = {};
      if ((_a = req.body) === null || _a === void 0 ? void 0 : _a.data) {
        parsedBody = safeJsonParse(req.body.data);
      }
      // Merge taxDocuments data from parsedBody with file data
      if (fileData.taxDocuments && parsedBody.taxDocuments) {
        const taxDocsFromBody = Array.isArray(parsedBody.taxDocuments)
          ? parsedBody.taxDocuments
          : [];
        fileData.taxDocuments = fileData.taxDocuments.map((doc, index) =>
          Object.assign(Object.assign({}, doc), taxDocsFromBody[index] || {}),
        );
        // Remove taxDocuments from parsedBody to avoid duplication
        delete parsedBody.taxDocuments;
      }
      // Merge insuranceHub data from parsedBody with file data
      if (fileData.insuranceHub && parsedBody.insuranceHub) {
        const insuranceHubFromBody = Array.isArray(parsedBody.insuranceHub)
          ? parsedBody.insuranceHub
          : [];
        fileData.insuranceHub = fileData.insuranceHub.map((doc, index) =>
          Object.assign(
            Object.assign({}, doc),
            insuranceHubFromBody[index] || {},
          ),
        );
        // Remove insuranceHub from parsedBody to avoid duplication
        delete parsedBody.insuranceHub;
      }
      req.body = Object.assign(
        Object.assign(Object.assign({}, req.body), parsedBody),
        fileData,
      );
      if (req.body.data) {
        delete req.body.data;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
exports.parseFileData = parseFileData;
