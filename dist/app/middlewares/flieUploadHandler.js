"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUploadHandler = exports.FILE_CONFIG = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const ApiErrors_1 = __importDefault(require("../../errors/ApiErrors"));
const BASE_UPLOAD_DIR = path_1.default.join(process.cwd(), "uploads");
// config
exports.FILE_CONFIG = {
  image: {
    dir: "image",
    maxCount: 14,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/svg+xml",
    ]),
  },
  profileImage: {
    dir: "profileImage",
    maxCount: 1,
    mimeTypes: new Set(["image/png", "image/jpeg", "image/webp"]),
  },
  originalImage: {
    dir: "originalImage",
    maxCount: 1,
    mimeTypes: new Set(["image/png", "image/jpeg"]),
  },
  images: {
    dir: "images",
    maxCount: 10,
    mimeTypes: new Set(["image/png", "image/jpeg", "image/webp"]),
  },
  drivingLicense: {
    dir: "drivingLicense",
    maxCount: 1,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf",
    ]),
  },
  liveSelfie: {
    dir: "liveSelfie",
    maxCount: 1,
    mimeTypes: new Set(["image/png", "image/jpeg", "image/webp"]),
  },
  vehicleLicense: {
    dir: "vehicleLicense",
    maxCount: 1,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf",
    ]),
  },
  personalAutoInsurance: {
    dir: "personalAutoInsurance",
    maxCount: 1,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf",
    ]),
  },
  insuranceHub: {
    dir: "insuranceHub",
    maxCount: 10,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf",
    ]),
  },
  thumbnail: {
    dir: "thumbnail",
    maxCount: 5,
    mimeTypes: new Set(["image/png", "image/jpeg", "image/webp"]),
  },
  logo: {
    dir: "logo",
    maxCount: 5,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ]),
  },
  banner: {
    dir: "banner",
    maxCount: 5,
    mimeTypes: new Set(["image/png", "image/jpeg", "image/webp"]),
  },
  coverImage: {
    dir: "coverImage",
    maxCount: 1,
    mimeTypes: new Set(["image/png", "image/jpeg", "image/webp"]),
  },
  audio: {
    dir: "audio",
    maxCount: 5,
    mimeTypes: new Set(["audio/mpeg", "audio/wav", "audio/ogg"]),
  },
  video: {
    dir: "video",
    maxCount: 5,
    mimeTypes: new Set(["video/mp4", "video/webm"]),
  },
  document: {
    dir: "document",
    maxCount: 10,
    mimeTypes: new Set([
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/pdf",
    ]),
  },
  taxDocuments: {
    dir: "taxDocuments",
    maxCount: 10,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/pdf",
    ]),
  },
};
// utils
const ensureDir = (dir) => {
  if (!fs_1.default.existsSync(dir))
    fs_1.default.mkdirSync(dir, { recursive: true });
};
const generateFileName = (originalName) => {
  const ext = path_1.default.extname(originalName);
  const base = path_1.default
    .basename(originalName, ext)
    .toLowerCase()
    .replace(/\s+/g, "-");
  return `${base}-${Date.now()}${ext}`;
};
// storage
const storage = multer_1.default.diskStorage({
  destination: (req, file, cb) => {
    const config = exports.FILE_CONFIG[file.fieldname];
    const dir = config
      ? path_1.default.join(BASE_UPLOAD_DIR, config.dir)
      : path_1.default.join(BASE_UPLOAD_DIR, "others");
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, generateFileName(file.originalname));
  },
});
// file filter
const fileFilter = (req, file, cb) => {
  const config = exports.FILE_CONFIG[file.fieldname];
  if (!config) {
    return cb(new ApiErrors_1.default(400, "Unsupported file field"));
  }
  if (!file.mimetype || !config.mimeTypes.has(file.mimetype)) {
    return cb(
      new ApiErrors_1.default(400, `Invalid file type for ${file.fieldname}`),
    );
  }
  cb(null, true);
};
// main upload
const upload = (0, multer_1.default)({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});
// optional field filtering (production improvement)
const fileUploadHandler = (allowedFields) => {
  const fields = Object.entries(exports.FILE_CONFIG)
    .filter(([name]) => !allowedFields || allowedFields.includes(name))
    .map(([name, config]) => ({
      name,
      maxCount: config.maxCount,
    }));
  return upload.fields(fields);
};
exports.fileUploadHandler = fileUploadHandler;
exports.default = exports.fileUploadHandler;
