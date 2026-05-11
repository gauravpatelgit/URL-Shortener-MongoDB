const mongoose = require("mongoose");
const clickQueue = require("../queues/clickQueue");
const Location = require("../models/location");
const TimeStat = require("../models/time_stat");
const redis = require("../config/redisClient");
const connectDB = require("../config/db");

console.log("🚀 Worker started...");

// =========================================
// 🔥 DB CONNECT
// =========================================

if (mongoose.connection.readyState === 0) {
  connectDB();
}

// =========================================
// 🌍 GEO FETCH FUNCTION
// =========================================

async function getGeoData(userIp) {
  try {
    // =========================================
    // 🔥 REDIS CHECK
    // =========================================

    const cached = await redis.get(userIp);

    if (cached) {
      console.log("⚡ GEO from cache");

      return JSON.parse(cached);
    }

    // =========================================
    // 🌍 ALL APIs
    // =========================================

    const apis = [
      // =========================================
      // API 1 -> ipapi.co
      // =========================================

      async () => {
        const res = await fetch(`https://ipapi.co/${userIp}/json/`);

        const data = await res.json();

        return {
          continent: data.continent_code,
          country: data.country_name,
          state: data.region,
          city: data.city,
          provider: "ipapi.co",
        };
      },

      // =========================================
      // API 2 -> ipwho.is
      // =========================================

      async () => {
        const res = await fetch(`https://ipwho.is/${userIp}`);

        const data = await res.json();

        return {
          continent: data.continent,
          country: data.country,
          state: data.region,
          city: data.city,
          provider: "ipwho.is",
        };
      },

      // =========================================
      // API 3 -> ip-api.com
      // =========================================

      async () => {
        const res = await fetch(`http://ip-api.com/json/${userIp}`);

        const data = await res.json();

        return {
          continent: data.continent,
          country: data.country,
          state: data.regionName,
          city: data.city,
          provider: "ip-api.com",
        };
      },

      // =========================================
      // API 4 -> freeipapi.com
      // =========================================

      async () => {
        const res = await fetch(`https://freeipapi.com/api/json/${userIp}`);

        const data = await res.json();

        return {
          continent: data.continent,
          country: data.countryName,
          state: data.regionName,
          city: data.cityName,
          provider: "freeipapi.com",
        };
      },
    ];

    // =========================================
    // 🎲 RANDOM API
    // =========================================

    const randomIndex = Math.floor(Math.random() * apis.length);

    console.log(`🎲 Using API Index: ${randomIndex}`);

    let geoData = null;

    // =========================================
    // 🔥 TRY RANDOM API
    // =========================================

    try {
      geoData = await apis[randomIndex]();

      console.log(`✅ Provider Used: ${geoData.provider}`);
    } catch (err) {
      console.log("❌ Random API failed:", err.message);

      // =========================================
      // 🔥 BACKUP API
      // =========================================

      const backupIndex = (randomIndex + 1) % apis.length;

      try {
        geoData = await apis[backupIndex]();

        console.log(`✅ Backup Provider Used: ${geoData.provider}`);
      } catch (backupErr) {
        console.log("❌ Backup API failed:", backupErr.message);
      }
    }

    // =========================================
    // 🔥 FALLBACK
    // =========================================

    if (!geoData) {
      geoData = {
        continent: "Unknown",
        country: "Unknown",
        state: "Unknown",
        city: "Unknown",
      };
    }

    // =========================================
    // 🔥 NORMALIZE
    // =========================================

    geoData = {
      continent: geoData.continent || "Unknown",
      country: geoData.country || "Unknown",
      state: geoData.state || "Unknown",
      city: geoData.city || "Unknown",
    };

    console.log("📦 FINAL GEO:", geoData);

    // =========================================
    // 🔥 SAVE CACHE
    // =========================================

    await redis.set(userIp, JSON.stringify(geoData), "EX", 86400);

    return geoData;
  } catch (err) {
    console.log("❌ GEO ERROR:", err.message);

    return {
      continent: "Unknown",
      country: "Unknown",
      state: "Unknown",
      city: "Unknown",
    };
  }
}

// =========================================
// 🔥 WORKER
// =========================================

clickQueue.process(async (job) => {
  console.log("🔥 Job received:", job.data);

  try {
    const { urlId, userIp, clicks = 1 } = job.data;

    // =========================================
    // 🌍 GET GEO
    // =========================================

    const geoData = await getGeoData(userIp);

    const continent = geoData.continent;
    const country = geoData.country;
    const state = geoData.state;
    const city = geoData.city;

    // =========================================
    // 🌍 LOCATION SAVE
    // =========================================

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

    // =========================================
    // ⏱ INDIA TIME
    // =========================================

    const now = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      }),
    );

    const date = now.toLocaleDateString("en-CA");

    const hour = now.getHours();

    // =========================================
    // ⏱ TIME SAVE
    // =========================================

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
