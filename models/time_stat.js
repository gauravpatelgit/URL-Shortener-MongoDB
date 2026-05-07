const mongoose = require("mongoose");

const timeStatSchema = new mongoose.Schema({
  urlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Url",
    required: true,
  },

  date: String,
  hour: Number,

  clicks: {
    type: Number,
    default: 0,
  },
});

module.exports = mongoose.model("TimeStat", timeStatSchema);