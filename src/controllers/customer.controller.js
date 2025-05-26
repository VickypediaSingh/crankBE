const express = require("express");
const router = express.Router();
const {
  authenticateJWT,
  authorizeRoles,
} = require("../middlewares/auth.middlewares");

const customerService = require("../services/customer.service");

// Send OTP
router.post(
  "/send-otp",
  (req, res, next) => {
    req.body.type = "customer";
    next();
  },
  authenticateJWT,
  authorizeRoles("distributor"),
  customerService.sendOtp
);

// Verify OTP
router.post("/verify-otp", customerService.verifyOtp);

// Create Customer
router.post(
  "/create",
  authenticateJWT,
  authorizeRoles("distributor"),
  customerService.createCustomer
);

router.get(
  "/list",
  //authenticateJWT,
  //authorizeRoles("admin"),
  customerService.customerslist
);

module.exports = router;
