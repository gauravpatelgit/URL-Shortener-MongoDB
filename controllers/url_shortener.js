const Url = require("../models/url");

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const createShortUrl = async (req, res) => {
  try {
    const { long_url, shortId } = req.body;

    if (!long_url || !shortId) {
      return res.status(400).json({
        success: false,
        message: "URL and path name required ⚠️",
      });
    }

    if (!isValidUrl(long_url)) {
      return res.status(400).json({
        success: false,
        message: "Invalid URL ❌",
      });
    }

    const validShortId = /^[A-Za-z0-9_-]{1,5}$/;
    if (!validShortId.test(shortId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid path name ❌",
      });
    }

    const existing = await Url.findOne({ shortId });

    if (existing) {
      return res.json({
        success: false,
        message: "Path already exists, please try another path name ⚠️",
      });
    }

    const newUrl = new Url({
      longUrl: long_url,
      shortId: shortId || nanoid(6),
    });

    await newUrl.save();

    res.json({
      success: true,
      message: "Short URL Created 🎉",
      shortUrl: shortId,
    });
  } catch (err) {
    console.error("🔥 ERROR:", err);
    res.status(500).json({
      success: false,
      error: err.message,
      message: "Server error ❌",
    });
  }
};

module.exports = { createShortUrl };
