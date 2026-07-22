"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.responseMode = void 0;
const responseMode_1 = require("../constants/responseMode");
exports.responseMode = process.env.RESPONSE_MODE === responseMode_1.RESPONSE_MODE.SOFT
    ? responseMode_1.RESPONSE_MODE.SOFT
    : responseMode_1.RESPONSE_MODE.STRICT;
console.log("ENV RESPONSE_MODE =", process.env.RESPONSE_MODE);
console.log("RESOLVED MODE =", exports.responseMode);
