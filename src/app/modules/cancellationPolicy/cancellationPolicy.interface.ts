import { Types } from "mongoose";
import { ISoftDeleteModel } from "../../../types/softDelete";

export interface IPassengerCancellationPolicyScenario {
  cancellationFee: number;
  platformShare: number;
  driverCompensation: number;
}

export interface IDriverCancellationPolicyScenario {
  cancellationFee: number;
  platformShare: number;
}

export interface ICancellationPolicy {
  passenger: {
    beforeDriverAccepted: IPassengerCancellationPolicyScenario;
    afterDriverAccepted: IPassengerCancellationPolicyScenario;
    afterDriverArrived: IPassengerCancellationPolicyScenario;
  };
  driver: {
    afterAccept: IDriverCancellationPolicyScenario;
    excessiveCancellation: IDriverCancellationPolicyScenario;
    excessiveCancellationThreshold: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type CancellationPolicyModel = ISoftDeleteModel<ICancellationPolicy>;
