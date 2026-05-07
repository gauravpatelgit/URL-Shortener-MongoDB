// models/Location.js
const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  urlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Url",
    required: true,
  },

  continent: String,
  country: String,
  state: String,
  city: String,

  clicks: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("Location", locationSchema);