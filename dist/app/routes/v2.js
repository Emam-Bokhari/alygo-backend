"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_routes_1 = require("../modules/user/user.routes");
const v2Router = express_1.default.Router();
const apiRoutes = [
    {
        path: "/users",
        route: user_routes_1.UserRoutes,
    },
];
apiRoutes.forEach((route) => v2Router.use(route.path, route.route));
exports.default = v2Router;
