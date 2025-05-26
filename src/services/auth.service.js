const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function loginService(email, password) {
  let user = null;
  let role = null;

  // Check admins table
  const adminResult = await pool.query("SELECT * FROM admin WHERE email = $1", [
    email,
  ]);

  if (adminResult.rows.length === 0) {
    throw new Error("Invalid email or password");
  }

  user = adminResult.rows[0];
  role = "admin";

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { token, role };
}

async function verifyOtpDistributor(req, res) {
  try {
    const { mobile_number, otp } = req.body;

    // 1. Fetch OTP record
    const result = await pool.query(
      `SELECT * FROM otp_verification WHERE mobile_number = $1 ORDER BY created_at DESC LIMIT 1`,
      [mobile_number]
    );
    const record = result.rows[0];

    if (
      !record ||
      record.verified ||
      new Date(record.expires_at) < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    // 2. Mark OTP as verified
    await pool.query(
      `UPDATE otp_verification SET verified = true WHERE mobile_number = $1`,
      [mobile_number]
    );

    // 3. Fetch distributor details
    const distResult = await pool.query(
      `SELECT * FROM distributer WHERE mobile_number = $1`,
      [mobile_number]
    );

    if (distResult.rows.length === 0) {
      return res.status(404).json({ message: "Distributor not found" });
    }

    const distributor = distResult.rows[0];

    // 4. Generate JWT
    const token = jwt.sign(
      {
        id: distributor.id,
        mobile: distributor.mobile_number,
        role: "distributor",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(token);

    // 5. Return token and role
    res.json({
      message: "OTP verified successfully",
      token,
      role: "distributor",
    });
  } catch (err) {
    console.error("Error in verifyOtp:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function verifyOtpAdmin(req, res) {
  try {
    const { mobile_number, otp } = req.body;

    // 1. Fetch OTP record
    const result = await pool.query(
      `SELECT * FROM otp_verification WHERE mobile_number = $1 ORDER BY created_at DESC LIMIT 1`,
      [mobile_number]
    );
    const record = result.rows[0];

    if (
      !record ||
      record.verified ||
      new Date(record.expires_at) < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    // 2. Mark OTP as verified
    await pool.query(
      `UPDATE otp_verification SET verified = true WHERE mobile_number = $1`,
      [mobile_number]
    );

    // 3. Fetch distributor details
    const adminResult = await pool.query(
      `SELECT * FROM admin WHERE mobile_number = $1`,
      [mobile_number]
    );

    if (adminResult.rows.length === 0) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const admin = adminResult.rows[0];

    // 4. Generate JWT
    const token = jwt.sign(
      {
        id: admin.id,
        mobile: admin.mobile_number,
        role: "admin",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Return token and role
    res.json({
      message: "OTP verified successfully",
      token,
      role: "admin",
    });
  } catch (err) {
    console.error("Error in verifyOtp:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = {
  loginService,
  verifyOtpDistributor,
  verifyOtpAdmin,
};
