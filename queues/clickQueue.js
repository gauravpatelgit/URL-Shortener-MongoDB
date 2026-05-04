const Queue = require("bull");
const redisConfig = require("../config/redis");

const clickQueue = new Queue("clickQueue", {
  redis: redisConfig,
});

module.exports = clickQueue;