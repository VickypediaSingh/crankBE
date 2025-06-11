const express = require("express");
const multer = require("multer");
const {
  handleDistributorCSVBuffer,
  createDistributor,
  downloadDistributors,
  downloadRecipients,
  getAllDistributorsSummary,
  getDailyRecipients,
  getADistributorSummary,
  assignAdditionalUnits,
  updateDistributorUnits,
} = require("../services/admin.service");
const validateNumbers = require("../middlewares/numberValidation");
const {
  authenticateJWT,
  authorizeRoles,
} = require("../middlewares/auth.middlewares");

const router = express.Router();

// Use multer memory storage (file kept in memory, not saved to disk)
const storage = multer.memoryStorage();
const upload = multer({ storage });

function formatPhoneNumber(number) {
  // Remove all non-digit characters just in case
  number = number.replace(/\D/g, "");

  // If it starts with '91' and length is more than 10, remove the prefix
  if (number.startsWith("91") && number.length > 10) {
    return number.slice(-10);
  }

  return number;
}
//
// "/logout",
router.post("/logout", authenticateJWT, async (req, res) => {
  try {
    const userRole = req.user.role; // Assuming your JWT contains the role

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
      role: userRole, // Send back the role
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Logout failed" });
  }
});

//
// "/assign-units/:distributorId",
router.post(
  "/assign-units/:distributorId",
  authenticateJWT,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      console.log("Request body:", req.body);
      console.log("Request params:", req.params);

      const { distributorId } = req.params;
      const { new_allocated, new_remaining } = req.body;

      if (isNaN(new_allocated) || isNaN(new_remaining)) {
        console.log("Invalid units received");
        return res.status(400).json({ error: "Invalid units value" });
      }

      console.log("Attempting to update:", {
        distributorId,
        new_allocated,
        new_remaining,
      });

      const result = await updateDistributorUnits(
        distributorId,
        parseInt(new_allocated, 10),
        parseInt(new_remaining, 10)
      );

      console.log("Update successful:", result);
      res.json(result);
    } catch (error) {
      console.error("Full error stack:", error);
      res.status(500).json({
        error: error.message,
        details:
          process.env.NODE_ENV === "development"
            ? {
                stack: error.stack,
                type: error.name,
              }
            : undefined,
      });
    }
  }
);

//
// "/assign-more-to-an-ambassador",
router.post(
  "/assign-more-to-an-ambassador",
  authenticateJWT,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await getAllDistributorsSummary();
      res.json(result);
    } catch (err) {
      console.log("Error: ", err);
      const status = err.status || 500;
      res
        .status(status)
        .json({ message: err.message || "Error fetching ambassadors summary" });
    }
  }
);

//
// "/get-daily-recipients",
router.post(
  "/get-daily-recipients",
  authenticateJWT,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await getDailyRecipients();
      res.json(result);
    } catch (err) {
      console.log("Error: ", err);
      const status = err.status || 500;
      res
        .status(status)
        .json({ message: err.message || "Error fetching daily recipients" });
    }
  }
);

//
// "/upload-distributors",
router.post(
  "/upload-distributors",
  authenticateJWT,
  authorizeRoles("admin"),
  upload.single("file"), // Expect field name as 'file'
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "CSV file is required" });
      }

      const result = await handleDistributorCSVBuffer(req.file.buffer);
      res.json({
        message: "Distributors uploaded successfully",
        inserted: result,
      });
    } catch (err) {
      console.error("CSV Upload Error:", err);
      res.status(500).json({ message: "Error uploading ambassador" });
    }
  }
);

//
// "/create-distributor",
router.post(
  "/create-distributor",
  authenticateJWT,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await createDistributor(req.body);
      res.json(result);
    } catch (err) {
      console.error("Create Distributor Error:", err);
      const status = err.status || 500;
      res
        .status(status)
        .json({ message: err.message || "Error creating ambassador" });
    }
  }
);

//
// "/distributors-summary",
router.get(
  "/distributors-summary",
  authenticateJWT,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await getAllDistributorsSummary();
      res.json(result);
    } catch (err) {
      console.log("Error: ", err);
      const status = err.status || 500;
      res
        .status(status)
        .json({ message: err.message || "Error fetching ambassadors" });
    }
  }
);

//
// "/distributor-summary",
router.get(
  "/distributor-summary",
  authenticateJWT,
  authorizeRoles("distributor"),
  async (req, res) => {
    try {
      const distributorId = req.user.id;
      const result = await getADistributorSummary(distributorId);
      if (!result) {
        return res.status(404).json({ message: "Ambassador not found" });
      }
      result.mobile_number = formatPhoneNumber(result.mobile_number);
      console.log("new result", result);
      res.json(result);
    } catch (err) {
      console.log("Error: ", err);
      const status = err.status || 500;
      res
        .status(status)
        .json({ message: err.message || "Error fetching ambassadors" });
    }
  }
);

//
// "/download-distributors",
router.get(
  "/download-distributors",
  authenticateJWT,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await downloadDistributors(req.body);
      res.header("Content-Type", "text/csv");
      res.attachment("distributors.csv");
      res.send(result);
    } catch (err) {
      console.error("Fetching CSV error:", err);
      const status = err.status || 500;
      res
        .status(status)
        .json({ message: err.message || "Error downloading ambassadors' CSV" });
    }
  }
);

//
// "/download-recipients",
router.get(
  "/download-recipients",
  //authenticateJWT,
  //authorizeRoles("admin"),
  async (req, res) => {
    try {
      const result = await downloadRecipients(req.body);
      res.header("Content-Type", "text/csv");
      res.attachment("Recipients.csv");
      res.send(result);
    } catch (err) {
      console.error("Fetching CSV error:", err);
      const status = err.status || 500;
      res
        .status(status)
        .json({ message: err.message || "Error downloading CSV" });
    }
  }
);
//
module.exports = router;

// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
