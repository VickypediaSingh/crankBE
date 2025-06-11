const express = require("express");
const { loginService } = require("../services/auth.service");
const {
  verifyOtpAdmin,
  verifyOtpDistributor,
} = require("../services/auth.service");
const customerService = require("../services/customer.service");

const router = express.Router();

router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await loginService(email, password);
    console.log("result", result);
    res.json(result);
  } catch (err) {
    if (err.message === "Invalid email or password") {
      return res.status(401).json({ message: err.message });
    }
    console.error("Login error:", err);
    res.status(500).json({ message: "Some error occured while logging in" });
  }
});

router.post(
  "/admin/send-otp",
  (req, res, next) => {
    req.body.type = "admin";
    next();
  },
  customerService.sendOtp
);

router.post("/admin/verify-otp", verifyOtpAdmin);

router.post(
  "/distributor/send-otp",
  (req, res, next) => {
    req.body.type = "distributor";
    next();
  },
  customerService.sendOtp
);

router.post("/distributor/verify-otp", verifyOtpDistributor);

module.exports = router;
