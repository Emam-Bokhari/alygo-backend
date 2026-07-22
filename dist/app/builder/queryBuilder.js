"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
class QueryBuilder {
  constructor(modelQuery, query) {
    this.modelQuery = modelQuery;
    this.query = query || {};
  }
  // 🔍 Search (String + ObjectId support)
  search(searchableFields) {
    const searchTerm = this.query.searchTerm;
    if (!searchTerm) return this;
    const orConditions = [];
    // String field search only
    searchableFields.forEach((field) => {
      orConditions.push({
        [field]: { $regex: searchTerm, $options: "i" },
      });
    });
    // Support combined brand and model search if both are searchable
    if (
      searchableFields.includes("brand") &&
      searchableFields.includes("model")
    ) {
      orConditions.push({
        $expr: {
          $or: [
            {
              $regexMatch: {
                input: { $concat: ["$brand", " ", "$model"] },
                regex: searchTerm,
                options: "i",
              },
            },
            {
              $regexMatch: {
                input: { $concat: ["$model", " ", "$brand"] },
                regex: searchTerm,
                options: "i",
              },
            },
          ],
        },
      });
    }
    // ObjectId exact match
    if (mongoose_1.Types.ObjectId.isValid(searchTerm)) {
      orConditions.push({
        _id: new mongoose_1.Types.ObjectId(searchTerm),
      });
      orConditions.push({
        bookingId: new mongoose_1.Types.ObjectId(searchTerm),
      });
    }
    this.modelQuery = this.modelQuery.find({ $or: orConditions });
    return this;
  }
  // 🎯 Filter (Boolean, Date, exact match)
  filter() {
    const queryObj = Object.assign({}, this.query);
    const excludeFields = ["searchTerm", "sort", "limit", "page", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);
    // HISTORY special case
    if (queryObj.status === "HISTORY") {
      delete queryObj.status;
      this.modelQuery = this.modelQuery
        .where("status")
        .in(["CANCELLED", "COMPLETED"]);
    }
    // Boolean & Date filters (for Booking)
    ["checkIn", "checkOut", "isCancelled"].forEach((field) => {
      if (queryObj[field] !== undefined) {
        this.modelQuery = this.modelQuery.where(field).equals(queryObj[field]);
        delete queryObj[field];
      }
    });
    ["fromDate", "toDate"].forEach((field) => {
      if (queryObj[field]) {
        const date = new Date(queryObj[field]);
        if (field === "fromDate")
          this.modelQuery = this.modelQuery
            .where("fromDate")
            .gte(date.getTime());
        if (field === "toDate")
          this.modelQuery = this.modelQuery.where("toDate").lte(date.getTime());
        delete queryObj[field];
      }
    });
    if (Object.keys(queryObj).length > 0) {
      this.modelQuery = this.modelQuery.find(queryObj);
    }
    return this;
  }
  // ↕️ Sort
  sort() {
    var _a;
    const sort =
      ((_a = this.query.sort) === null || _a === void 0
        ? void 0
        : _a.split(",").join(" ")) || "-createdAt";
    this.modelQuery = this.modelQuery.sort(sort);
    return this;
  }
  // 📄 Pagination
  paginate() {
    const page = Number(this.query.page) || 1;
    const limit = Number(this.query.limit) || 10;
    const skip = (page - 1) * limit;
    this.modelQuery = this.modelQuery.skip(skip).limit(limit);
    return this;
  }
  // 📌 Field Selection
  fields() {
    var _a;
    const fields =
      ((_a = this.query.fields) === null || _a === void 0
        ? void 0
        : _a.split(",").join(" ")) || "-__v";
    this.modelQuery = this.modelQuery.select(fields);
    return this;
  }
  // 📊 Meta Count
  countTotal() {
    return __awaiter(this, void 0, void 0, function* () {
      const filter = this.modelQuery.getFilter();
      const total = yield this.modelQuery.model.countDocuments(filter);
      const page = Number(this.query.page) || 1;
      const limit = Number(this.query.limit) || 10;
      const totalPage = Math.ceil(total / limit);
      return { page, limit, total, totalPage };
    });
  }
}
exports.default = QueryBuilder;
