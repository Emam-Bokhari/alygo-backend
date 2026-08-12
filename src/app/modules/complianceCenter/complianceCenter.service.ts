import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import QueryBuilder from "../../builder/queryBuilder";
import { Driver } from "../driver/driver.model";
import { Car } from "../car/car.model";
import { User } from "../user/user.model";
import {
  BACKGROUND_CHECK_FEE_SEARCHABLE_FIELDS,
  DOCUMENT_EXPIRY_WARNING_DAYS,
  FEE_STATUS,
  DOCUMENT_MONITORING_STATUS as DOCUMENT_MONITORING_STATUS_CONST,
} from "./complianceCenter.constant";
import {
  IBackgroundCheckFee,
  IDriverDocument,
  IDriverDocumentMonitoring,
  IDocumentMonitoringQuery,
  DOCUMENT_MONITORING_STATUS,
} from "./complianceCenter.interface";
import { BackgroundCheckFee } from "./complianceCenter.model";
import { ServiceArea } from "../serviceArea/serviceArea.model";
import { DRIVER_STATUS } from "../../../enums/user";

// ==========================================
// 1. BACKGROUND CHECK FEES — CRUD SERVICES
// ==========================================

const populateFeeLocationData = async (payload: Partial<IBackgroundCheckFee>) => {
  if (payload.serviceAreaId) {
    const serviceArea = await ServiceArea.findById(payload.serviceAreaId);
    if (serviceArea) {
      if (!payload.applicableState) {
        payload.applicableState =
          serviceArea.state || serviceArea.city || serviceArea.zone || serviceArea.country || "";
      }
      if (serviceArea.location?.coordinates && serviceArea.location.coordinates.length === 2 && !payload.location) {
        payload.location = serviceArea.location;
      }
    }
  }
};

const createBackgroundCheckFeeToDB = async (
  payload: IBackgroundCheckFee,
): Promise<IBackgroundCheckFee> => {
  await populateFeeLocationData(payload);
  const result = await BackgroundCheckFee.create(payload);
  return result;
};

const getAllBackgroundCheckFeesFromDB = async (
  query: Record<string, unknown>,
) => {
  const backgroundCheckFeeQuery = new QueryBuilder(
    BackgroundCheckFee.find().populate("serviceAreaId"),
    query,
  )
    .search(BACKGROUND_CHECK_FEE_SEARCHABLE_FIELDS)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await backgroundCheckFeeQuery.modelQuery;
  const meta = await backgroundCheckFeeQuery.countTotal();

  return {
    meta,
    result,
  };
};

const getSingleBackgroundCheckFeeFromDB = async (
  id: string,
): Promise<IBackgroundCheckFee | null> => {
  const fee = await BackgroundCheckFee.findById(id).populate("serviceAreaId");
  if (!fee) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Background check fee not found");
  }
  return fee;
};

const updateBackgroundCheckFeeInDB = async (
  id: string,
  payload: Partial<IBackgroundCheckFee>,
): Promise<IBackgroundCheckFee | null> => {
  const existingFee = await BackgroundCheckFee.findById(id);
  if (!existingFee) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Background check fee not found");
  }

  await populateFeeLocationData(payload);

  const updatedFee = await BackgroundCheckFee.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate("serviceAreaId");

  return updatedFee;
};

const deleteBackgroundCheckFeeFromDB = async (
  id: string,
): Promise<IBackgroundCheckFee | null> => {
  const existingFee = await BackgroundCheckFee.findById(id);
  if (!existingFee) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Background check fee not found");
  }

  // Soft delete using model softDeleteById method
  const deletedFee = await BackgroundCheckFee.softDeleteById(id);
  return deletedFee;
};

const updateFeeStatusInDB = async (
  id: string,
  status: "active" | "inactive",
): Promise<IBackgroundCheckFee | null> => {
  const existingFee = await BackgroundCheckFee.findOne({ _id: id }).setOptions({
    withDeleted: true,
  });

  if (!existingFee) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Background check fee not found");
  }

  // If status is active, softDeletePlugin handles reactivation automatically
  const updatedFee = await BackgroundCheckFee.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true, withDeleted: true },
  );

  return updatedFee;
};

// ==========================================
// 2. DOCUMENT MONITORING SERVICE
// ==========================================

const getDocumentMonitoringFromDB = async (
  queryParams: IDocumentMonitoringQuery,
) => {
  const page = Number(queryParams.page) || 1;
  const limit = Number(queryParams.limit) || 10;
  const searchTerm = queryParams.searchTerm
    ? String(queryParams.searchTerm).trim().toLowerCase()
    : "";

  // 1. Fetch drivers and cars
  const drivers = await Driver.find().populate({
    path: "userId",
    select: "name email phone profileImage status",
  });

  const cars = await Car.find();

  // Create a map of driverId string -> Car array
  const driverCarsMap = new Map<string, any[]>();
  cars.forEach((car) => {
    const dId = car.driverId?.toString();
    if (dId) {
      if (!driverCarsMap.has(dId)) {
        driverCarsMap.set(dId, []);
      }
      driverCarsMap.get(dId)!.push(car);
    }
  });

  const now = new Date();
  const driverMonitoringList: IDriverDocumentMonitoring[] = [];

  for (const driver of drivers) {
    const user = driver.userId as any;
    const driverIdStr = driver._id.toString();
    const driverName = user?.name || "Unknown Driver";
    const driverEmail = user?.email || "";
    const driverPhone = user?.phone || "";

    // Helper to calculate days remaining and status for each document
    const evaluateDocument = (
      docType: string,
      docUrl: string | undefined,
      docNumber: string | undefined,
      expirationDate: Date | undefined | null,
      ownerType: "driver" | "car",
      carId?: string,
      carInfo?: string,
    ): IDriverDocument => {
      let daysRemaining: number | null = null;
      let calculatedStatus: DOCUMENT_MONITORING_STATUS =
        DOCUMENT_MONITORING_STATUS_CONST.PENDING;

      if (expirationDate) {
        const exp = new Date(expirationDate);
        const diffMs = exp.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          calculatedStatus = DOCUMENT_MONITORING_STATUS_CONST.EXPIRED;
        } else if (daysRemaining <= DOCUMENT_EXPIRY_WARNING_DAYS) {
          calculatedStatus = DOCUMENT_MONITORING_STATUS_CONST.EXPIRING_SOON;
        } else {
          if (docUrl || docNumber) {
            calculatedStatus =
              driver.approvalStatus === DRIVER_STATUS.REJECTED
                ? DOCUMENT_MONITORING_STATUS_CONST.REJECTED
                : DOCUMENT_MONITORING_STATUS_CONST.APPROVED;
          } else {
            calculatedStatus = DOCUMENT_MONITORING_STATUS_CONST.PENDING;
          }
        }
      } else {
        if (docUrl || docNumber) {
          calculatedStatus =
            driver.approvalStatus === DRIVER_STATUS.REJECTED
              ? DOCUMENT_MONITORING_STATUS_CONST.REJECTED
              : DOCUMENT_MONITORING_STATUS_CONST.APPROVED;
        } else {
          calculatedStatus = DOCUMENT_MONITORING_STATUS_CONST.PENDING;
        }
      }

      const itemId = `${driverIdStr}-${ownerType}-${carId || "driver"}-${docType.replace(/\s+/g, "-").toLowerCase()}`;

      return {
        id: itemId,
        ownerType,
        carId,
        carInfo,
        documentType: docType,
        documentUrl: docUrl || "",
        documentNumber: docNumber || "",
        expirationDate: expirationDate || null,
        daysRemaining,
        status: calculatedStatus,
      };
    };

    const rawDriverDocs: IDriverDocument[] = [];

    // A. Driver Documents
    rawDriverDocs.push(
      evaluateDocument(
        "Driver License",
        driver.drivingLicense,
        driver.drivingLicenseNumber,
        driver.drivingLicenseExpirationDate || driver.licenseExpiryDate,
        "driver",
      ),
    );
    rawDriverDocs.push(
      evaluateDocument(
        "SSN Card",
        driver.ssnCard,
        driver.ssn,
        driver.ssnCardExpirationDate,
        "driver",
      ),
    );
    rawDriverDocs.push(
      evaluateDocument(
        "Tax Document",
        driver.taxDocument,
        driver.taxIdValue,
        driver.taxDocumentExpirationDate,
        "driver",
      ),
    );

    // B. Car Documents
    const driverCars = driverCarsMap.get(driverIdStr) || [];
    for (const car of driverCars) {
      const carInfo = `${car.brand} ${car.model} (${car.licensePlate})`;
      const carIdStr = car._id.toString();

      rawDriverDocs.push(
        evaluateDocument(
          "Vehicle Registration",
          car.vehicleRegistration,
          car.vehicleRegistrationNumber,
          car.vehicleRegistrationExpirationDate,
          "car",
          carIdStr,
          carInfo,
        ),
      );
      rawDriverDocs.push(
        evaluateDocument(
          "Vehicle Inspection",
          car.vehicleInspection,
          car.vehicleInspectionNumber,
          car.vehicleInspectionExpirationDate,
          "car",
          carIdStr,
          carInfo,
        ),
      );
      rawDriverDocs.push(
        evaluateDocument(
          "Personal Auto Insurance",
          car.personalAutoInsurance,
          car.personalAutoInsuranceNumber,
          car.personalAutoInsuranceExpirationDate,
          "car",
          carIdStr,
          carInfo,
        ),
      );
      rawDriverDocs.push(
        evaluateDocument(
          "Commercial Insurance",
          car.commercialInsurance,
          car.commercialInsuranceNumber,
          car.commercialInsuranceExpirationDate,
          "car",
          carIdStr,
          carInfo,
        ),
      );
      rawDriverDocs.push(
        evaluateDocument(
          "Vehicle License",
          car.vehicleLicense,
          "",
          car.vehicleLicenseExpirationDate,
          "car",
          carIdStr,
          carInfo,
        ),
      );
    }

    // Filter documents by document-level criteria
    let filteredDocs = rawDriverDocs;

    if (queryParams.documentType) {
      const docTypeFilter = queryParams.documentType.toLowerCase();
      filteredDocs = filteredDocs.filter((doc) =>
        doc.documentType.toLowerCase().includes(docTypeFilter),
      );
    }

    if (queryParams.status) {
      const statusFilter = queryParams.status.toLowerCase();
      filteredDocs = filteredDocs.filter(
        (doc) => doc.status.toLowerCase() === statusFilter,
      );
    }

    if (queryParams.expirationStatus) {
      if (queryParams.expirationStatus === "expired") {
        filteredDocs = filteredDocs.filter(
          (doc) => doc.daysRemaining !== null && doc.daysRemaining < 0,
        );
      } else if (queryParams.expirationStatus === "expiring_soon") {
        filteredDocs = filteredDocs.filter(
          (doc) =>
            doc.daysRemaining !== null &&
            doc.daysRemaining >= 0 &&
            doc.daysRemaining <= DOCUMENT_EXPIRY_WARNING_DAYS,
        );
      } else if (queryParams.expirationStatus === "active") {
        filteredDocs = filteredDocs.filter(
          (doc) =>
            doc.daysRemaining === null ||
            doc.daysRemaining > DOCUMENT_EXPIRY_WARNING_DAYS,
        );
      }
    }

    const driverMatchesSearch =
      searchTerm &&
      (driverName.toLowerCase().includes(searchTerm) ||
        driverEmail.toLowerCase().includes(searchTerm) ||
        driverPhone.toLowerCase().includes(searchTerm));

    if (searchTerm && !driverMatchesSearch) {
      filteredDocs = filteredDocs.filter(
        (doc) =>
          doc.documentType.toLowerCase().includes(searchTerm) ||
          (doc.carInfo && doc.carInfo.toLowerCase().includes(searchTerm)),
      );
    }

    // Filter by driverId if specified
    if (queryParams.driverId && driverIdStr !== queryParams.driverId) {
      continue;
    }

    // Keep driver if driver matches search or has matching documents
    if (filteredDocs.length > 0) {
      driverMonitoringList.push({
        driverId: driverIdStr,
        driverName,
        driverEmail,
        driverPhone,
        documents: filteredDocs,
      });
    }
  }

  // Paginate driver list
  const total = driverMonitoringList.length;
  const totalPage = Math.ceil(total / limit) || 1;
  const skip = (page - 1) * limit;
  const paginatedDrivers = driverMonitoringList.slice(skip, skip + limit);

  return {
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
    result: paginatedDrivers,
  };
};

export const ComplianceCenterService = {
  createBackgroundCheckFeeToDB,
  getAllBackgroundCheckFeesFromDB,
  getSingleBackgroundCheckFeeFromDB,
  updateBackgroundCheckFeeInDB,
  deleteBackgroundCheckFeeFromDB,
  updateFeeStatusInDB,
  getDocumentMonitoringFromDB,
};
