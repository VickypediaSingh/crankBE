const express = require("express");
const bodyParser = require("body-parser");
const authRoutes = require("./src/controllers/auth.controller");
const adminRoutes = require("./src/controllers/admin.controller");
const customerRoutes = require("./src/controllers/customer.controller");
const cors = require("cors");
require("dotenv").config();
const {
  authenticateJWT,
  authorizeRoles,
} = require("./src/middlewares/auth.middlewares");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
// Sample route
app.get("/", (req, res) => {
  res.send("Hello, world! Express is running.");
});
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/customer", customerRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
