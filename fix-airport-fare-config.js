const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/alygo")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Import the FareConfiguration model
const FareConfiguration =
  require("./dist/app/modules/fareConfiguration/fareConfiguration.model").FareConfiguration;

async function fixFareConfiguration() {
  try {
    // Update the airport fare configuration with the correct rideCategoryId
    const fareConfig = await FareConfiguration.findByIdAndUpdate(
      "6a5b0cb1ae072853104f8365",
      { rideCategoryId: "6a59b093ec029a501f10cd62" },
      { new: true },
    );

    if (!fareConfig) {
      console.log("Fare configuration not found");
      process.exit(1);
    }

    console.log("✅ Fare configuration updated with rideCategoryId:");
    console.log(fareConfig);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating fare configuration:", error);
    process.exit(1);
  }
}

fixFareConfiguration();
