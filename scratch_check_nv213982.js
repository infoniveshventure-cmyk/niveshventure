const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// Load .env
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/^"|"$/g, "");
      process.env[key] = val;
    }
  });
}

const MONGO_URI = process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const user = await mongoose.connection.db.collection("users").findOne({ memberId: "NV213982" });
  console.log("User document:");
  console.log(JSON.stringify(user, null, 2));

  const predictions = await mongoose.connection.db.collection("predictionsubmissions").find({ memberId: "NV213982" }).toArray();
  console.log("\nPredictions:");
  console.log(JSON.stringify(predictions, null, 2));

  const returns = await mongoose.connection.db.collection("dailyreturns").find({ memberId: "NV213982" }).toArray();
  console.log("\nDaily Returns:");
  console.log(JSON.stringify(returns, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
