// models/Location.js
const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  shortId: String,   // किस URL का data है
  continent: String,
  country: String,
  state: String,
  city: String,
  clicks: { type: Number, default: 0 },
});

module.exports = mongoose.model("Location", locationSchema);