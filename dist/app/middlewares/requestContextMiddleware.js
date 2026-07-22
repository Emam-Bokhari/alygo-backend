"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestContextMiddleware = void 0;
const requestContext_1 = require("../../shared/requestContext");
const requestContextMiddleware = (req, res, next) => {
  (0, requestContext_1.runWithContext)({ googleRouteCache: new Map() }, () => {
    next();
  });
};
exports.requestContextMiddleware = requestContextMiddleware;
