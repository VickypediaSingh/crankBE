// middlewares/auth.js
const jwt = require("jsonwebtoken");
require("dotenv").config();

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { email, role, iat, exp }
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    console.log("allowedRoles", allowedRoles);
    console.log("userrole", req.user.role);
    const boolValue = allowedRoles.includes(req.user.role);
    console.log("boolValue", boolValue);
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
}

module.exports = {
  authenticateJWT,
  authorizeRoles,
};
