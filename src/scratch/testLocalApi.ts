import axios from "axios";

async function runTest() {
  try {
    console.log("Logging in...");
    const loginRes = await axios.post("http://10.10.7.10:5005/api/v1/auth/login", {
      email: "admin@gmail.com",
      password: "admin123",
    });

    console.log("Login Response:", loginRes.data);
    const token = loginRes.data.data.token;
    console.log("Login success! Token obtained.");

    console.log("Requesting driver overview...");
    const overviewRes = await axios.get("http://10.10.7.10:5005/api/v1/driver-management/overview", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("API Response:", JSON.stringify(overviewRes.data, null, 2));
  } catch (error: any) {
    console.error("Test failed:", error.response?.data || error.message);
  }
}

runTest();
