const Url = require("../models/url");
const clickQueue = require("../queues/clickQueue");
const redis = require("../config/redisClient");

const redirectUrl = async (req, res) => {
  try {
    const { shortId } = req.params;

    let longUrl;
    let urlData;

    // ==============================
    // 🔥 REDIS GET
    // ==============================

    try {
      const cachedUrl = await redis.get(`url:${shortId}`);

      if (cachedUrl) {
        console.log("⚡ Cache hit:", shortId);

        longUrl = cachedUrl;

        // urlData still needed for _id
        urlData = await Url.findOne({ shortId });
      }
    } catch (err) {
      console.log("Redis GET error:", err.message);
    }

    // ==============================
    // 🌐 DB CALL
    // ==============================

    if (!longUrl) {
      console.log("🌐 DB call:", shortId);

      urlData = await Url.findOne({ shortId });

      if (!urlData) {
        return res.status(404).json({
          success: false,
          message: "URL not found ❌",
        });
      }

      longUrl = urlData.longUrl;

      try {
        await redis.set(`url:${shortId}`, longUrl, "EX", 86400);
      } catch (err) {
        console.log("Redis SET error:", err.message);
      }
    }

    if (!longUrl) {
      return res.status(500).json({
        success: false,
        message: "URL missing ❌",
      });
    }

    // ==============================
    // 🌍 USER IP
    // ==============================

    let userIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "";

    // localhost testing
    if (
      userIp === "::1" ||
      userIp === "127.0.0.1" ||
      userIp.includes("::ffff:127.0.0.1")
    ) {
      const ipArray = [
        "8.8.8.8",
        "1.1.1.1",
        "142.250.183.14",
        "13.107.21.200",
        "151.101.1.69",
        "172.217.167.78",
        "23.216.146.45",
        "104.16.132.229",
        "185.199.108.153",
        "52.95.110.1",
      ];

      userIp = ipArray[Math.floor(Math.random() * ipArray.length)];
    }

    console.log("🌍 USER IP:", userIp);

    // ==============================
    // 🔥 QUEUE
    // ==============================

    clickQueue
      .add({
        urlId: urlData._id,
        userIp,
        clicks: 1,
      })
      .then(() =>
        console.log("📤 Job added successfully:", urlData._id, userIp)
      )
      .catch((err) => console.log("Queue error:", err.message));

    return res.redirect(longUrl);
  } catch (err) {
    console.error("🔥 FULL ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Server error ❌",
    });
  }
};

module.exports = { redirectUrl };