import { Schema, Query, Aggregate, Document, Model } from "mongoose";

// soft delete interfaces for methods
export interface ISoftDeleteMethods {
  softDelete(): Promise<Document>;
  restore(): Promise<Document>;
}

// soft delete interfaces for statics
export interface ISoftDeleteStatics<T> extends Model<T> {
  softDeleteById(id: string, options?: any): Promise<T | null>;
  restoreById(id: string, options?: any): Promise<T | null>;
  softDeleteMany(filter: Record<string, any>, options?: any): Promise<any>;
  restoreMany(filter: Record<string, any>, options?: any): Promise<any>;
}

function getUpdatedStatus(update: any): string | undefined {
  if (!update) return undefined;
  if (Array.isArray(update)) {
    for (const stage of update) {
      if (stage && stage.$set && stage.$set.status) {
        return stage.$set.status;
      }
    }
    return undefined;
  }
  if (update.$set && update.$set.status) {
    return update.$set.status;
  }
  if (update.status) {
    return update.status;
  }
  return undefined;
}

function setRestoreInUpdate(update: any) {
  if (!update) return;

  if (Array.isArray(update)) {
    for (const stage of update) {
      if (stage && stage.$set) {
        stage.$set.isDeleted = false;
        stage.$set.deletedAt = null;
      }
    }
    return;
  }

  if (update.$set) {
    update.$set.isDeleted = false;
    update.$set.deletedAt = null;
  } else {
    const keys = Object.keys(update);
    const hasOperators = keys.some((key) => key.startsWith("$"));
    if (hasOperators) {
      if (!update.$set) {
        update.$set = {};
      }
      update.$set.isDeleted = false;
      update.$set.deletedAt = null;
    } else {
      update.isDeleted = false;
      update.deletedAt = null;
    }
  }
}

export function softDeletePlugin<T>(schema: Schema<T>) {
  // add isDeleted fields to schema if not already defined
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, index: true },
  } as any);

  // query protection
  const excludeDeletedFilter = async function (this: Query<any, any>) {
    if ((this as any)._softDeleteProcessed) {
      return;
    }
    (this as any)._softDeleteProcessed = true;

    const filters = this.getFilter();
    const options = this.getOptions();
    const isPopulate =
      options &&
      options.skip === undefined &&
      options.limit === undefined &&
      options.perDocumentLimit === undefined &&
      ("skip" in options ||
        "limit" in options ||
        "perDocumentLimit" in options);
    if (isPopulate || (options && options.withDeleted)) {
      return;
    }
    if ((filters as Record<string, any>).isDeleted !== undefined) {
      return;
    }

    let isReactivation = false;
    if (schema.path("status")) {
      const update = this.getUpdate();
      const statusValue = getUpdatedStatus(update);
      const hasStatusActive =
        typeof statusValue === "string" &&
        statusValue.toLowerCase() === "active";
      if (hasStatusActive) {
        const queryOptions: any = { withDeleted: true };
        if (options && options.session) {
          queryOptions.session = options.session;
        }
        const model = (this as any).model;
        if (model) {
          const doc = await model.findOne(filters).setOptions(queryOptions);
          const currentStatus = doc?.status;
          const isCurrentInactive =
            typeof currentStatus === "string" &&
            currentStatus.toLowerCase() === "inactive";
          if (doc && doc.isDeleted === true && isCurrentInactive) {
            isReactivation = true;
            setRestoreInUpdate(update);
          }
        }
      }
    }

    if (isReactivation) {
      return;
    }

    this.where({ isDeleted: { $ne: true } });
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
    schema.pre(method as any, excludeDeletedFilter as any);
  });

  // update hooks
  schema.pre(/update/i, excludeDeletedFilter as any);

  // pre-save hook for document reactivation
  schema.pre("save", function (this: any, next) {
    if (schema.path("status")) {
      const statusVal = this.status;
      const isStatusActive =
        typeof statusVal === "string" && statusVal.toLowerCase() === "active";
      if (
        this.isModified("status") &&
        isStatusActive &&
        this.isDeleted === true
      ) {
        this.isDeleted = false;
        this.deletedAt = null;
      }
    }
    next();
  });

  // aggregation projection
  schema.pre("aggregate", function (this: Aggregate<any>) {
    // Add $match stage to pipeline to exclude deleted documents
    // But only if $geoNear is not the first stage, because $geoNear must be first
    const pipeline = this.pipeline();
    const firstStage = pipeline[0];

    const options = this.options;
    if (options && options.withDeleted) {
      return;
    }

    if (!firstStage || !("$geoNear" in firstStage)) {
      pipeline.unshift({ $match: { isDeleted: { $ne: true } } });
    }
  });

  // inside methods
  schema.methods.softDelete = function () {
    (this as any).isDeleted = true;
    (this as any).deletedAt = new Date();
    if (schema.path("status")) {
      (this as any).status = "inactive";
    }
    return this.save();
  };

  schema.methods.restore = function () {
    (this as any).isDeleted = false;
    (this as any).deletedAt = null;
    return this.save();
  };

  // static methods
  schema.statics.softDeleteById = function (id: string, options?: any) {
    const update: Record<string, any> = {
      isDeleted: true,
      deletedAt: new Date(),
    };
    if (schema.path("status")) {
      update.status = "inactive";
    }
    return this.findOneAndUpdate({ _id: id } as any, { $set: update } as any, {
      new: true,
      ...options,
    });
  };

  schema.statics.restoreById = function (id: string, options?: any) {
    // restore a single document by ID
    // explicitly filter out deleted documents
    return (this as Model<T>).findOneAndUpdate(
      { _id: id, isDeleted: true } as any,
      { $set: { isDeleted: false, deletedAt: null } } as any,
      { new: true, ...options },
    );
  };

  schema.statics.softDeleteMany = function (
    filter: Record<string, any>,
    options?: any,
  ) {
    const update: Record<string, any> = {
      isDeleted: true,
      deletedAt: new Date(),
    };
    if (schema.path("status")) {
      update.status = "inactive";
    }
    return this.updateMany(
      filter as any,
      {
        $set: update,
      } as any,
      options,
    );
  };

  schema.statics.restoreMany = function (
    filter: Record<string, any>,
    options?: any,
  ) {
    return this.updateMany(
      { ...filter, isDeleted: true } as any,
      { $set: { isDeleted: false, deletedAt: null } } as any,
      options,
    );
  };
}
