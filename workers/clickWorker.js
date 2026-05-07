const mongoose = require("mongoose");
const clickQueue = require("../queues/clickQueue");
const Location = require("../models/location");
const TimeStat = require("../models/time_stat");
const redis = require("../config/redisClient");
const connectDB = require("../config/db");

console.log("🚀 Worker started...");

if (mongoose.connection.readyState === 0) {
  connectDB();
}

clickQueue.process(async (job) => {
  console.log("🔥 Job received:", job.data);

  const { urlId, userIp, clicks = 1 } = job.data;

  let geoData = null;

  try {
    // 🔥 Redis check
    const cached = await redis.get(userIp);

    if (cached) {
      geoData = JSON.parse(cached);
      console.log("⚡ GEO from cache");
    } else {
      // 🔥 IP API (single stable source recommended)
      const res = await fetch(`https://ipwho.is/${userIp}`);
      const data = await res.json();

      if (data && data.success) {
        geoData = {
          continent: data.continent || "Unknown",
          country_name: data.country || "Unknown",
          region: data.region || "Unknown",
          city: data.city || "Unknown",
        };
      }
    }

    // 🔥 SAFE fallback
    if (!geoData) {
      geoData = {
        continent: "Unknown",
        country_name: "Unknown",
        region: "Unknown",
        city: "Unknown",
      };
    }

    console.log("📦 GEO DATA:", geoData);

    // 🔥 Save Redis
    await redis.set(userIp, JSON.stringify(geoData), "EX", 86400);

    // 🔥 normalize
    const continent = geoData.continent || "Unknown";
    const country = geoData.country_name || "Unknown";
    const state = geoData.region || "Unknown";
    const city = geoData.city || "Unknown";

    // 🔥 LOCATION SAVE
    const existingLocation = await Location.findOne({
      urlId,
      country,
      state,
      city,
      continent,
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

    // 🔥 TIME SAVE
    const now = new Date();
    const date = now.toLocaleDateString("en-CA");
    const hour = now.getHours();

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
