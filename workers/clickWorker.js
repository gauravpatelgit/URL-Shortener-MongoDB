const mongoose = require("mongoose");
const clickQueue = require("../queues/clickQueue");
const Location = require("../models/location");
const TimeStat = require("../models/time_stat");
const redis = require("../config/redisClient");
const connectDB = require("../config/db");

console.log("🚀 Worker started...");

// 🔥 DB CONNECT
if (mongoose.connection.readyState === 0) {
  connectDB();
}

// 🔥 WORKER
clickQueue.process(async (job) => {
  console.log("🔥 Job received:", job.data);

  const { urlId, userIp, clicks = 1 } = job.data;

  let geoData = null;

  try {
    // ==============================
    // 🔥 REMOVE OLD CACHE
    // ==============================

    await redis.del(userIp);

    // ==============================
    // 🔥 REDIS CHECK
    // ==============================

    const cached = await redis.get(userIp);

    if (cached) {
      geoData = JSON.parse(cached);

      console.log("⚡ GEO from cache");
    } else {
      // ==============================
      // 🌍 GEO API
      // ==============================

      const res = await fetch(`http://ip-api.com/json/${userIp}`);

      const data = await res.json();

      console.log("🌍 API RESPONSE:", data);

      // ==============================
      // ✅ SUCCESS
      // ==============================

      if (data && data.status === "success") {
        geoData = {
          continent: data.continent || "Asia",
          country_name: data.country || "Unknown",
          region: data.regionName || "Unknown",
          city: data.city || "Unknown",
        };
      }
    }

    // ==============================
    // 🔥 FALLBACK
    // ==============================

    if (!geoData) {
      geoData = {
        continent: "Unknown",
        country_name: "Unknown",
        region: "Unknown",
        city: "Unknown",
      };
    }

    console.log("📦 FINAL GEO DATA:", geoData);

    // ==============================
    // 🔥 SAVE REDIS
    // ==============================

    await redis.set(userIp, JSON.stringify(geoData), "EX", 86400);

    // ==============================
    // 🔥 NORMALIZE
    // ==============================

    const continent = geoData.continent || "Unknown";

    const country = geoData.country_name || "Unknown";

    const state = geoData.region || "Unknown";

    const city = geoData.city || "Unknown";

    // ==============================
    // 🌍 LOCATION SAVE
    // ==============================

    const existingLocation = await Location.findOne({
      urlId,
      continent,
      country,
      state,
      city,
    });

    if (existingLocation) {
      existingLocation.clicks += clicks;

      await existingLocation.save();
    } else {
      await Location.create({
        urlId,
        continent,
        country,
        state,
        city,
        clicks,
      });
    }

    console.log("🌍 Location saved");

    // ==============================
    // ⏱ INDIA TIME
    // ==============================

    const now = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      }),
    );

    const date = now.toLocaleDateString("en-CA");

    const hour = now.getHours();

    // ==============================
    // ⏱ TIME SAVE
    // ==============================

    const existingTime = await TimeStat.findOne({
      urlId,
      date,
      hour,
    });

    if (existingTime) {
      existingTime.clicks += clicks;

      await existingTime.save();
    } else {
      await TimeStat.create({
        urlId,
        date,
        hour,
        clicks,
      });
    }

    console.log("⏱ Time stats saved");
  } catch (err) {
    console.log("❌ Worker Error:", err.message);
  }
});