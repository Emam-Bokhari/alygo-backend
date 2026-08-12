import {
  DOCUMENT_EXPIRY_WARNING_DAYS,
  FEE_STATUS,
} from "../src/app/modules/complianceCenter/complianceCenter.constant";
import { ComplianceCenterService } from "../src/app/modules/complianceCenter/complianceCenter.service";

console.log("Compliance Center Constants Test:");
console.log("DOCUMENT_EXPIRY_WARNING_DAYS:", DOCUMENT_EXPIRY_WARNING_DAYS);
console.log("FEE_STATUS:", FEE_STATUS);
console.log(
  "ComplianceCenterService exported:",
  typeof ComplianceCenterService.getAllBackgroundCheckFeesFromDB === "function",
);

console.log("SUCCESS: Compliance Center module loaded properly.");
