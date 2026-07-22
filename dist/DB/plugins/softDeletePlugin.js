"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.softDeletePlugin = softDeletePlugin;
function softDeletePlugin(schema) {
    // add isDeleted fields to schema if not already defined
    schema.add({
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date, index: true },
    });
    // query protection
    const excludeDeletedFilter = function () {
        const filters = this.getFilter();
        if (filters.isDeleted === undefined) {
            this.where({ isDeleted: { $ne: true } });
        }
    };
    const queryMethods = [
        "find",
        "findOne",
        "findOneAndDelete",
        "findOneAndReplace",
        "findOneAndUpdate",
        "countDocuments",
        "distinct",
    ];
    queryMethods.forEach((method) => {
        schema.pre(method, excludeDeletedFilter);
    });
    // update hooks
    schema.pre(/update/i, function () {
        const filters = this.getFilter();
        if (filters.isDeleted === undefined) {
            this.where({ isDeleted: { $ne: true } });
        }
    });
    // aggregation projection
    schema.pre("aggregate", function () {
        // Add $match stage to pipeline to exclude deleted documents
        // But only if $geoNear is not the first stage, because $geoNear must be first
        const pipeline = this.pipeline();
        const firstStage = pipeline[0];
        if (!firstStage || !("$geoNear" in firstStage)) {
            pipeline.unshift({ $match: { isDeleted: { $ne: true } } });
        }
    });
    // inside methods
    schema.methods.softDelete = function () {
        this.isDeleted = true;
        this.deletedAt = new Date();
        return this.save();
    };
    schema.methods.restore = function () {
        this.isDeleted = false;
        this.deletedAt = null;
        return this.save();
    };
    // static methods
    schema.statics.softDeleteById = function (id) {
        return this.findOneAndUpdate({ _id: id }, { $set: { isDeleted: true, deletedAt: new Date() } }, { new: true });
    };
    schema.statics.restoreById = function (id) {
        // restore a single document by ID
        // explicitly filter out deleted documents
        return this.findOneAndUpdate({ _id: id, isDeleted: true }, { $set: { isDeleted: false, deletedAt: null } }, { new: true });
    };
    schema.statics.softDeleteMany = function (filter) {
        return this.updateMany(filter, {
            $set: { isDeleted: true, deletedAt: new Date() },
        });
    };
    schema.statics.restoreMany = function (filter) {
        return this.updateMany(Object.assign(Object.assign({}, filter), { isDeleted: true }), { $set: { isDeleted: false, deletedAt: null } });
    };
}
