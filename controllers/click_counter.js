const Url = require("../models/url");
const TimeStat = require("../models/time_stat");
const Location = require("../models/location");

const clickCounter = async (req, res) => {
  console.log("🔥 CLICK COUNTER HIT");
  try {
    const { shortId } = req.params;
    const { type } = req.query;

    console.log("shortId:", shortId);
    console.log("type:", type);

    const urlData = await Url.findOne({ shortId });

    if (!urlData) {
      return res.status(404).json({
        success: false,
        message: "URL not found ❌",
      });
    }

    const urlId = urlData._id;

    const now = new Date();
    let timeData = [];

    // ==============================
    // 🔥 HOUR (last 10 hours)
    // ==============================
    if (type === "hour") {
      const hours = [];

      for (let i = 9; i >= 0; i--) {
        const d = new Date(now);
        d.setHours(now.getHours() - i);

        const date =
          d.getFullYear() +
          "-" +
          String(d.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(d.getDate()).padStart(2, "0");

        const hour = d.getHours();

        hours.push({ date, hour });
      }

      const rawData = await TimeStat.find({
        urlId,
        $or: hours,
      });

      // 🔥 missing hours = 0 fill
      timeData = hours.map((h) => {
        const found = rawData.find(
          (r) => r.date === h.date && r.hour === h.hour,
        );
        return {
          label: h.hour + ":00",
          clicks: found ? found.clicks : 0,
        };
      });
    }

    // ==============================
    // 🔥 DAY (last 10 days)
    // ==============================
    else if (type === "day") {
      const days = [];

      for (let i = 9; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);

        const date =
          d.getFullYear() +
          "-" +
          String(d.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(d.getDate()).padStart(2, "0");

        days.push(date);
      }

      const rawData = await TimeStat.find({
        urlId,
        date: { $in: days },
      });

      timeData = days.map((d) => {
        const found = rawData.find((r) => r.date === d);
        return {
          label: d,
          clicks: found ? found.clicks : 0,
        };
      });
    }

    // ==============================
    // 🔥 WEEKLY (last 10 weeks)
    // ==============================
    else if (type === "weekly") {
      const weeks = [];

      for (let i = 9; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i * 7);

        const weekStart =
          d.getFullYear() +
          "-" +
          String(d.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(d.getDate()).padStart(2, "0");

        weeks.push(weekStart);
      }

      const rawData = await TimeStat.find({ urlId });

      timeData = weeks.map((weekStart) => {
        let total = 0;

        rawData.forEach((r) => {
          const diff =
            (new Date(weekStart) - new Date(r.date)) / (1000 * 60 * 60 * 24);

          if (diff >= 0 && diff < 7) {
            total += r.clicks;
          }
        });

        return {
          label: weekStart,
          clicks: total,
        };
      });
    }

    // ==============================
    // 🔥 MONTHLY (last 10 months)
    // ==============================
    else if (type === "monthly") {
      const months = [];

      for (let i = 9; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);

        const key =
          d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");

        months.push(key);
      }

      const rawData = await TimeStat.find({ urlId });

      timeData = months.map((m) => {
        let total = 0;

        rawData.forEach((r) => {
          const month = r.date.slice(0, 7); // YYYY-MM
          if (month === m) {
            total += r.clicks;
          }
        });

        return {
          label: m,
          clicks: total,
        };
      });
    }

    // ==============================
    // 🔥 LOCATION DATA
    // ==============================
    const locationData = await Location.find({ urlId });

    res.json({
      success: true,
      timeData,
      locationData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error ❌",
    });
  }
};

module.exports = { clickCounter };
