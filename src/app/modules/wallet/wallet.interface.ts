import { Model, Types } from "mongoose";
import { WALLET_STATUS } from "./wallet.constant";

export { WALLET_STATUS };

export interface IWallet {
  userId: Types.ObjectId; // Owner of the wallet (ref: User)
  balance: number; // Current wallet balance
  currency: string; // Currency of the wallet (e.g. USD, BDT)
  status: WALLET_STATUS; // Status of the wallet (active, restricted, suspended)
  createdAt: Date;
  updatedAt: Date;
}

export type WalletModel = Model<IWallet>;
