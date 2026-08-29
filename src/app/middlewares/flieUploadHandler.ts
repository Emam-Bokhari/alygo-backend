import { Request } from "express";
import fs from "fs";
import path from "path";
import multer, { FileFilterCallback } from "multer";
import ApiError from "../../errors/ApiErrors";

// types
type FileConfig = {
  dir: string;
  maxCount: number;
  mimeTypes: Set<string>;
};

const BASE_UPLOAD_DIR = path.join(process.cwd(), "uploads");

// config
export const FILE_CONFIG = {
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
    mimeTypes: new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
  },
  originalImage: {
    dir: "originalImage",
    maxCount: 1,
    mimeTypes: new Set(["image/png", "image/jpeg", "image/jpg"]),
  },
  images: {
    dir: "images",
    maxCount: 10,
    mimeTypes: new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
  },
  drivingLicense: {
    dir: "drivingLicense",
    maxCount: 1,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/pdf",
    ]),
  },
  liveSelfie: {
    dir: "liveSelfie",
    maxCount: 1,
    mimeTypes: new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
  },
  vehicleLicense: {
    dir: "vehicleLicense",
    maxCount: 1,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
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
      "image/jpg",
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
      "image/jpg",
      "image/webp",
      "application/pdf",
    ]),
  },
  thumbnail: {
    dir: "thumbnail",
    maxCount: 5,
    mimeTypes: new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
  },
  logo: {
    dir: "logo",
    maxCount: 5,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/svg+xml",
    ]),
  },
  banner: {
    dir: "banner",
    maxCount: 5,
    mimeTypes: new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
  },
  coverImage: {
    dir: "coverImage",
    maxCount: 1,
    mimeTypes: new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
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
      "image/jpg",
      "image/webp",
      "application/pdf",
    ]),
  },
  taxDocument: {
    dir: "taxDocument",
    maxCount: 1,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/pdf",
    ]),
  },
  vehicleRegistration: {
    dir: "vehicleRegistration",
    maxCount: 1,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/pdf",
    ]),
  },
  vehicleInspection: {
    dir: "vehicleInspection",
    maxCount: 1,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/pdf",
    ]),
  },
  commercialInsurance: {
    dir: "commercialInsurance",
    maxCount: 1,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/pdf",
    ]),
  },
  ssnCard: {
    dir: "ssnCard",
    maxCount: 1,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/pdf",
    ]),
  },
  uploadedFiles: {
    dir: "uploadedFiles",
    maxCount: 15,
    mimeTypes: new Set([
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/svg+xml",
      "video/mp4",
      "video/webm",
    ]),
  },
} satisfies Record<string, FileConfig>;

export type IFolderName = keyof typeof FILE_CONFIG;

// utils
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const generateFileName = (originalName: string) => {
  const ext = path.extname(originalName);
  const base = path
    .basename(originalName, ext)
    .toLowerCase()
    .replace(/\s+/g, "-");
  return `${base}-${Date.now()}${ext}`;
};

// storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const config = FILE_CONFIG[file.fieldname as IFolderName];

    const dir = config
      ? path.join(BASE_UPLOAD_DIR, config.dir)
      : path.join(BASE_UPLOAD_DIR, "others");

    ensureDir(dir);
    cb(null, dir);
  },

  filename: (req, file, cb) => {
    cb(null, generateFileName(file.originalname));
  },
});

// Helper to get allowed mime types by file extension
const getMimeTypesByExtension = (ext: string): string[] => {
  const normalizedExt = ext.toLowerCase();
  if (normalizedExt === ".jpg" || normalizedExt === ".jpeg") {
    return ["image/jpeg", "image/jpg"];
  }
  const map: Record<string, string> = {
    ".png": "image/png",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".txt": "text/plain",
    ".doc": "application/msword",
    ".docx": "application/msword",
  };
  return map[normalizedExt] ? [map[normalizedExt]] : [];
};

// file filter
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const config = FILE_CONFIG[file.fieldname as IFolderName];

  if (!config) {
    return cb(new ApiError(400, "Unsupported file field"));
  }

  // 1. Check if the mimetype provided by the client matches
  if (file.mimetype && config.mimeTypes.has(file.mimetype)) {
    return cb(null, true);
  }

  // 2. Fallback: check file extension and map to mimetype
  if (file.originalname) {
    const ext = path.extname(file.originalname);
    const potentialMimeTypes = getMimeTypesByExtension(ext);
    const matchesExtension = potentialMimeTypes.some((mime) =>
      config.mimeTypes.has(mime),
    );
    if (matchesExtension) {
      // Normalize the mimetype for later processing
      file.mimetype = potentialMimeTypes.find((mime) =>
        config.mimeTypes.has(mime),
      )!;
      return cb(null, true);
    }
  }

  console.error(
    `[Upload Error] Invalid file type for field '${file.fieldname}'. Uploaded mimetype: '${file.mimetype}', originalname: '${file.originalname}'`,
  );
  return cb(new ApiError(400, `Invalid file type for ${file.fieldname}`));
};

// main upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

// optional field filtering (production improvement)
export const fileUploadHandler = (allowedFields?: IFolderName[]) => {
  const fields = Object.entries(FILE_CONFIG)
    .filter(
      ([name]) => !allowedFields || allowedFields.includes(name as IFolderName),
    )
    .map(([name, config]) => ({
      name,
      maxCount: config.maxCount,
    }));

  return upload.fields(fields);
};

export default fileUploadHandler;
