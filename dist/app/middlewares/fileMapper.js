"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapFilesToUrls = exports.mapFileToUrl = void 0;
const mapFileToUrl = (file, folderName) => {
  return `/uploads/${folderName}/${file.filename}`;
};
exports.mapFileToUrl = mapFileToUrl;
const mapFilesToUrls = (files, folderName) => {
  return files.map((file) => (0, exports.mapFileToUrl)(file, folderName));
};
exports.mapFilesToUrls = mapFilesToUrls;
