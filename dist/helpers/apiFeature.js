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
class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  search(searchTarget) {
    const searchTerm = this.queryString.searchTerm;
    let query = {};
    if (searchTerm !== "undefined" && searchTerm !== undefined && searchTerm) {
      const regex = new RegExp(searchTerm, "i");
      query = Object.assign(Object.assign({}, query), {
        $or:
          searchTarget === null || searchTarget === void 0
            ? void 0
            : searchTarget.map((field) => ({
                [field]: {
                  $regex: regex,
                  $options: "i",
                },
              })),
      });
    }
    this.query = this.query.find(query);
    return this;
  }
  filter() {
    const queryCopy = Object.assign({}, this.queryString);
    // Removing fields not related to filtering
    const removeFields = ["searchTerm", "page", "sort", "limit"];
    removeFields.forEach((el) => delete queryCopy[el]);
    let query = {};
    // Handle price range filtering
    if (queryCopy.minPrice || queryCopy.maxPrice) {
      query.price = {};
      if (queryCopy.minPrice) {
        query.price.$gte = Number(queryCopy.minPrice); // Greater than or equal to minPrice
      }
      if (queryCopy.maxPrice) {
        query.price.$lte = Number(queryCopy.maxPrice); // Less than or equal to maxPrice
      }
    }
    // Handle rating filter (greater than or equal to a rating value)
    if (queryCopy.rating) {
      query.rating = { $gte: Number(queryCopy.rating) };
    }
    // Other filters can be added similarly, e.g., category, brand, etc.
    Object.keys(queryCopy).forEach((key) => {
      if (
        !removeFields.includes(key) &&
        !["minPrice", "maxPrice", "rating"].includes(key)
      ) {
        query[key] = queryCopy[key];
      }
    });
    this.query = this.query.find(query);
    return this;
  }
  pagination() {
    return __awaiter(this, void 0, void 0, function* () {
      // Get page and limit from query string
      const page = Number(this.queryString.page) || 1; // Default to page 1
      const limit = Number(this.queryString.limit) || 10; // Default to limit of 10
      // Calculate total documents and skip count
      const total = yield this.query.countDocuments();
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;
      // Apply pagination
      this.query = this.query.skip(skip).limit(limit);
      // Return pagination info
      return {
        total,
        totalPages,
        currentPage: page,
        limit,
      };
    });
  }
}
exports.default = APIFeatures;
