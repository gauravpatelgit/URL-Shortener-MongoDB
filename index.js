const express = require("express");
const cors = require("cors");
const urlRoutes = require("./routes/urlRoutes");
const connectDB = require("./config/db"); // ✅ NEW
require("dotenv").config();

const app = express();

// ✅ CORS (better using env)
app.use(
  cors({
    origin: [
      process.env.FRONTEND_local_URL,
      process.env.FRONTEND_PROD_URL,
      process.env.FRONTEND_PROD_URL_2,
      process.env.FRONTEND_PROD_URL_3,
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(express.json());

// ✅ DB connect
connectDB().then(() => {
  console.log("DB Ready ✅");
});

require("./workers/clickWorker");

// ✅ routes
app.use("/", urlRoutes);

// ✅ test route
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

// ✅ PORT from env
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
