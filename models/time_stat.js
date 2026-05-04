// models/TimeStat.js
const mongoose = require("mongoose");

const timeSchema = new mongoose.Schema({
  shortId: String,   // किस URL का data है
  date: String,      // "2026-04-25"
  hour: Number,      // 0–23
  clicks: { type: Number, default: 0 },
});

module.exports = mongoose.model("TimeStat", timeSchema);