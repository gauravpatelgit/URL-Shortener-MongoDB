const express = require("express");
const router = express.Router();

const { createShortUrl } = require("../controllers/url_shortener");
const { redirectUrl } = require("../controllers/redirect_url");
const { clickCounter } = require("../controllers/click_counter");

// 🔹 create short url
router.post("/shorten", createShortUrl);

// 🔹 click counter (FIXED)
router.get("/click-count/:shortId", clickCounter);

// 🔹 redirect (always last)
router.get("/:shortId", redirectUrl);

module.exports = router;