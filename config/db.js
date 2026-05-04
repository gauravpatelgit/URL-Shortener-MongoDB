const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Mongo Connected (Worker)");
  } catch (err) {
    console.log("❌ Mongo Error:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;