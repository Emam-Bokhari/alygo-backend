import { Model } from "mongoose";

export interface ISoftDeleteModel<T> extends Model<T> {
  softDeleteById(id: string, options?: any): Promise<T | null>;
  restoreById(id: string, options?: any): Promise<T | null>;
  softDeleteMany(filter: any, options?: any): Promise<any>;
  restoreMany(filter: any, options?: any): Promise<any>;
}
