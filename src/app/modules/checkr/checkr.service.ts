import axios from "axios";
import config from "../../../config";

// Setup Checkr HTTP client with basic authorization (API Key as username, empty password)
const checkrClient = axios.create({
  baseURL: config.checkr.baseUrl,
  auth: {
    username: config.checkr.apiKey,
    password: "",
  },
});

/**
 * Checkr API Integration Service
 */
const createCandidate = async (candidateData: {
  first_name: string;
  last_name: string;
  middle_name?: string;
  no_middle_name?: boolean;
  email: string;
  phone: string;
  dob: string; // YYYY-MM-DD
  ssn?: string;
  zipcode?: string;
  driver_license_number?: string;
  driver_license_state?: string;
  copy_requested?: boolean;
  work_locations?: { country: string; state?: string; city?: string }[];
}) => {
  try {
    const response = await checkrClient.post("/v1/candidates", candidateData);
    return response.data;
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    // Log safe parts of error, avoid logging sensitive candidate data or API keys
    console.error("Checkr Candidate Creation Failed:", {
      status: error.response?.status,
      error: errorDetails,
    });
    throw error;
  }
};

const updateCandidate = async (
  candidateId: string,
  updateData: {
    ssn?: string;
    zipcode?: string;
    driver_license_number?: string;
    driver_license_state?: string;
  },
) => {
  try {
    const response = await checkrClient.post(
      `/v1/candidates/${candidateId}`,
      updateData,
    );
    return response.data;
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    console.error(
      `Checkr Candidate Update Failed for Candidate ${candidateId}:`,
      {
        status: error.response?.status,
        error: errorDetails,
      },
    );
    throw error;
  }
};

const createReport = async (
  candidateId: string,
  type: "mvr" | "background",
) => {
  try {
    const packageName =
      type === "mvr"
        ? config.checkr.mvrPackage
        : config.checkr.backgroundCheckPackage;

    const response = await checkrClient.post("/v1/reports", {
      candidate_id: candidateId,
      package: packageName,
    });
    return response.data;
  } catch (error: any) {
    const errorDetails = error.response?.data || error.message;
    console.error("Checkr Report Creation Failed:", {
      status: error.response?.status,
      error: errorDetails,
    });
    throw error;
  }
};

export const CheckrService = {
  createCandidate,
  updateCandidate,
  createReport,
};
