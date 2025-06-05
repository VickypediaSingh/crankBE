// src/middlewares/numberValidation.js

const validateNumbers = (req, res, next) => {
  // Validate additional_units if present
  if (req.body.additional_units !== undefined) {
    const num = Number(req.body.additional_units);

    if (isNaN(num)) {
      return res.status(400).json({
        error: "Additional units must be a valid number",
      });
    }

    // Optional: Validate number range
    if (num < -2000 || num > 2000) {
      return res.status(400).json({
        error: "Additional units must be between -2000 and 2000",
      });
    }

    // Convert to number if it was sent as string
    req.body.additional_units = num;
  }

  next();
};

module.exports = validateNumbers;
