"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContext = exports.runWithContext = exports.requestContext = void 0;
const async_hooks_1 = require("async_hooks");
exports.requestContext = new async_hooks_1.AsyncLocalStorage();
const runWithContext = (context, fn) => {
    return exports.requestContext.run(context, fn);
};
exports.runWithContext = runWithContext;
const getContext = () => {
    return exports.requestContext.getStore();
};
exports.getContext = getContext;
