"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRefundPercentage = void 0;
const calculateRefundPercentage = (fromDate) => {
    const now = Date.now();
    const diffMs = fromDate.getTime() - now;
    if (diffMs <= 0)
        return 0;
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours >= 12 ? 1 : 0.5;
};
exports.calculateRefundPercentage = calculateRefundPercentage;
