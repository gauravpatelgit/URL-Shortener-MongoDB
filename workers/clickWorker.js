const clickQueue = require("../queues/clickQueue");
const Location = require("../models/location");
const TimeStat = require("../models/time_stat");
const redis = require("../config/redisClient");
const connectDB = require("../config/db");

connectDB();

// 🔥 Worker start
clickQueue.process(async (job) => {
  const { shortId, userIp, clicks = 1 } = job.data;

      let geoData;

      try {
        // 🔥 Redis cache
        const cached = await redis.get(userIp);

        if (cached) {
          geoData = JSON.parse(cached);
        } else {
          try {
            let res1 = await fetch(`https://freeipapi.com/api/json/${userIp}`);
            let data1 = await res1.json();

            if (data1 && data1.ipAddress) {
              geoData = {
                continent: data1.continentName,
                continent_code: data1.continentCode,
                country_name: data1.countryName,
                region: data1.regionName,
                city: data1.cityName,
              };
            } else throw new Error();
          } catch {
            try {
              let res2 = await fetch(`https://ipapi.co/${userIp}/json/`);
              let data2 = await res2.json();

              if (!data2.error) {
                geoData = {
                  continent: data2.continent_code,
                  country_name: data2.country_name,
                  region: data2.region,
                  city: data2.city,
                };
              } else throw new Error();
            } catch {
              let res3 = await fetch(`http://ip-api.com/json/${userIp}`);
              let data3 = await res3.json();

              geoData = {
                continent: data3.continent,
                country_name: data3.country,
                region: data3.regionName,
                city: data3.city,
              };
            }
          }

          // 🔥 Redis save (1 day)
          await redis.set(userIp, JSON.stringify(geoData), "EX", 86400);
        }

        // 🔥 safe values
        const continent =
          geoData?.continent_code || geoData?.continent || "Unknown";
        const country = geoData?.country_name || "Unknown";
        const state = geoData?.region || "Unknown";
        const city = geoData?.city || "Unknown";

        // 🔥 LOCATION
        const existingLocation = await Location.findOne({
          shortId,
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
            shortId,
            continent,
            country,
            state,
            city,
            clicks,
          });
        }

        // 🔥 TIME
        const now = new Date();
        const date = now.toLocaleDateString("en-CA");
        const hour = now.getHours();

        const existingTime = await TimeStat.findOne({
          shortId,
          date,
          hour,
        });

        if (existingTime) {
          existingTime.clicks += clicks;
          await existingTime.save();
        } else {
          await TimeStat.create({
            shortId,
            date,
            hour,
            clicks,
          });
        }
      } catch (err) {
        console.log("❌ Worker Error:", err.message);
      }
    });
  
