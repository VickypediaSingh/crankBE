// const db = require("../config/db");
// const axios = require("axios");

// const generateOTP = () =>
//   Math.floor(100000 + Math.random() * 900000).toString();

// exports.sendOtp = async (req, res) => {
//   try {
//     const { mobile_number, type } = req.body;
//     const cleanMobileNumber = mobile_number.replace(/[^\d+]/g, "");
//     console.log("userType", type);
//     //Step 1: Check if customer already exists
//     if (type === "customer") {
//       const existingCustomer = await db.query(
//         `SELECT id FROM customer WHERE mobile_number = $1`,
//         [mobile_number]
//       );

//       if (existingCustomer.rows.length > 0) {
//         return res.status(400).json({
//           message: "A recipient already exists with this mobile number",
//         });
//       }
//     }

//     if (type === "distributor") {
//       const existingAmbassador = await db.query(
//         `SELECT id FROM distributer WHERE mobile_number = $1`,
//         [mobile_number]
//       );

//       if (existingAmbassador.rows.length === 0) {
//         return res.status(400).json({
//           message: "Ambassador does not exist with this mobile number",
//         });
//       }
//     }

//     if (type === "admin") {
//       const existingAdmin = await db.query(
//         `SELECT id FROM admin WHERE mobile_number = $1`,
//         [mobile_number]
//       );

//       if (existingAdmin.rows.length === 0) {
//         return res.status(400).json({
//           message: "Admin does not exist with this mobile number",
//         });
//       }
//     }

//     const otp = generateOTP();
//     const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

//     await db.query(
//       `INSERT INTO otp_verification (mobile_number, otp, expires_at, verified)
//        VALUES ($1, $2, $3, false)
//        ON CONFLICT (mobile_number) DO UPDATE SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at, verified = false`,
//       [cleanMobileNumber, otp, expiresAt]
//     );

//     await axios.post(
//       "https://bmfvr1xpt7.execute-api.ap-south-1.amazonaws.com/v1/smsapi",
//       { num: cleanMobileNumber, otp },
//       {
//         headers: {
//           Accept: "application/json",
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     res.json({ message: "OTP sent successfully" });
//   } catch (err) {
//     console.error("Error in sendOtp:", err);
//     res.status(500).json({ message: "Error sending OTP" });
//   }
// };

// exports.verifyOtp = async (req, res) => {
//   try {
//     const { mobile_number, otp } = req.body;
//     const result = await db.query(
//       `SELECT * FROM otp_verification WHERE mobile_number = $1`,
//       [mobile_number]
//     );
//     const record = result.rows[0];

//     if (
//       !record ||
//       record.verified ||
//       new Date(record.expires_at) < new Date()
//     ) {
//       return res.status(400).json({ message: "Invalid or expired OTP" });
//     }

//     if (record.otp !== otp) {
//       return res.status(400).json({ message: "Incorrect OTP" });
//     }

//     await db.query(
//       `UPDATE otp_verification SET verified = true WHERE mobile_number = $1`,
//       [mobile_number]
//     );

//     res.json({ message: "OTP verified successfully" });
//   } catch (err) {
//     console.error("Error in verifyOtp:", err);
//     res.status(500).json({ message: "Error verifying OTP" });
//   }
// };

// exports.createCustomer = async (req, res) => {
//   try {
//     const { name, mobile_number } = req.body;
//     const distributorMobileNumber = req.user.mobile;

//     const otpCheck = await db.query(
//       `SELECT * FROM otp_verification WHERE mobile_number = $1 AND verified = true`,
//       [mobile_number]
//     );
//     if (!otpCheck.rowCount) {
//       return res.status(400).json({ message: "OTP not verified" });
//     }

//     const existingCustomer = await db.query(
//       `SELECT * FROM customer WHERE mobile_number = $1`,
//       [mobile_number]
//     );
//     if (existingCustomer.rowCount > 0) {
//       return res.status(400).json({
//         message: "A recipient already exists with this mobile number",
//       });
//     }

//     const distributor = await db.query(
//       `SELECT id FROM distributer WHERE mobile_number = $1`,
//       [distributorMobileNumber]
//     );
//     const distributorData = distributor.rows[0];

//     if (!distributorData) {
//       return res.status(400).json({ message: "Ambassador not found" });
//     }

//     // Step 4: Check if distributor has any quantity left
//     if (distributorData.allotted_quantity <= 0) {
//       return res
//         .status(400)
//         .json({ message: "No more quantity available for this distributor" });
//     }

//     const customer = await db.query(
//       `INSERT INTO customer (name, mobile_number) VALUES ($1, $2) RETURNING id`,
//       [name, mobile_number]
//     );
//     const customerId = customer.rows[0].id;

//     await db.query(
//       `INSERT INTO sale (distributor_id, customer_id) VALUES ($1, $2)`,
//       [distributorData.id, customerId]
//     );

//     await db.query(
//       `UPDATE distributer
//        SET quantity_remaining = quantity_remaining - 1
//        WHERE id = $1`,
//       [distributorData.id]
//     );

//     res.json({ message: "Customer created and sale recorded successfully" });
//   } catch (err) {
//     console.error("Error in createCustomer:", err);
//     res.status(500).json({ message: "Error creating recipient" });
//   }
// };

// exports.customerslist = async (req, res) => {
//   try {
//     // const query = `
//     //   SELECT
//     // c.mobile_number AS customer_mobile,
//     // d.mobile_number AS distributor_mobile
//     // FROM customer c
//     // JOIN sale s ON c.id = s.customer_id
//     // JOIN distributer d ON s.distributor_id = d.id;
//     // `;

//     const query = `SELECT
//     s.created_at AS date_time_received,
//     d.name AS ambassador_name,
//     d.mobile_number AS ambassador_phone,
//     c.name AS recipient_name,
//     c.mobile_number AS recipient_phone
//   FROM customer c
//   JOIN sale s ON c.id = s.customer_id
//   JOIN distributer d ON s.distributor_id = d.id
//   ORDER BY s.created_at DESC;`;

//     const result = await await db.query(query); // 'pool.query()' executes the SQL query
//     res.json(result.rows); // Send the result as a JSON response
//   } catch (error) {
//     console.error("Error fetching customers with distributors:", error);
//     res.status(500).json({ error: "Error fetching recipients" });
//   }
// };

// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// Ambassadors cannot register as recipients now
const db = require("../config/db");
const axios = require("axios");

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

exports.sendOtp = async (req, res) => {
  try {
    const { mobile_number, type } = req.body;
    const cleanMobileNumber = mobile_number.replace(/[^\d+]/g, "");
    console.log("userType", type);

    if (type === "customer") {
      // Check if this number belongs to a distributor
      const existingDistributor = await db.query(
        `SELECT id FROM distributer WHERE mobile_number = $1`,
        [cleanMobileNumber]
      );

      if (existingDistributor.rows.length > 0) {
        return res.status(400).json({
          message: "Ambassadors cannot register as recipients",
        });
      }
      // Check if this number is already a customer
      const existingCustomer = await db.query(
        `SELECT id FROM customer WHERE mobile_number = $1`,
        [cleanMobileNumber]
      );

      if (existingCustomer.rows.length > 0) {
        return res.status(400).json({
          message: "A recipient already exists with this mobile number",
        });
      }
    }

    if (type === "distributor") {
      const existingDistributor = await db.query(
        `SELECT id FROM distributer WHERE mobile_number = $1`,
        [cleanMobileNumber]
      );

      if (existingDistributor.rows.length === 0) {
        return res.status(400).json({
          message: "Ambassador does not exist with this mobile number",
        });
      }
    }

    if (type === "admin") {
      const existingAdmin = await db.query(
        `SELECT id FROM admin WHERE mobile_number = $1`,
        [cleanMobileNumber]
      );

      if (existingAdmin.rows.length === 0) {
        return res.status(400).json({
          message: "Admin does not exist with this mobile number",
        });
      }
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(
      `INSERT INTO otp_verification (mobile_number, otp, expires_at, verified)
       VALUES ($1, $2, $3, false)
       ON CONFLICT (mobile_number) DO UPDATE 
       SET otp = EXCLUDED.otp, expires_at = EXCLUDED.expires_at, verified = false`,
      [cleanMobileNumber, otp, expiresAt]
    );

    await axios.post(
      "https://bmfvr1xpt7.execute-api.ap-south-1.amazonaws.com/v1/smsapi",
      // "https://bmfvr1xpt7.execute-api.ap-south-1.amazonaws.com/v2/smsapi",
      { num: cleanMobileNumber, otp },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Error in sendOtp:", err);
    res.status(500).json({ message: "Error sending OTP" });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { mobile_number, otp } = req.body;
    const cleanMobileNumber = mobile_number.replace(/[^\d+]/g, "");

    const result = await db.query(
      `SELECT * FROM otp_verification WHERE mobile_number = $1`,
      [cleanMobileNumber]
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

    await db.query(
      `UPDATE otp_verification SET verified = true WHERE mobile_number = $1`,
      [cleanMobileNumber]
    );

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error("Error in verifyOtp:", err);
    res.status(500).json({ message: "Error verifying OTP" });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { name, mobile_number } = req.body;
    const distributorMobileNumber = req.user.mobile;
    const cleanMobileNumber = mobile_number.replace(/[^\d+]/g, "");

    // First check if this mobile number belongs to a distributor
    const existingDistributor = await db.query(
      `SELECT id FROM distributer WHERE mobile_number = $1`,
      [cleanMobileNumber]
    );

    if (existingDistributor.rows.length > 0) {
      return res.status(400).json({
        message: "Ambassadors cannot be registered as recipients",
      });
    }

    // Check OTP verification
    const otpCheck = await db.query(
      `SELECT * FROM otp_verification 
       WHERE mobile_number = $1 AND verified = true`,
      [cleanMobileNumber]
    );

    if (otpCheck.rows.length === 0) {
      return res.status(400).json({ message: "OTP not verified" });
    }

    // Check if customer already exists
    const existingCustomer = await db.query(
      `SELECT * FROM customer WHERE mobile_number = $1`,
      [cleanMobileNumber]
    );

    if (existingCustomer.rows.length > 0) {
      return res.status(400).json({
        message: "A recipient already exists with this mobile number",
      });
    }

    // Get distributor info
    const distributor = await db.query(
      `SELECT id, quantity_remaining FROM distributer 
       WHERE mobile_number = $1`,
      [distributorMobileNumber]
    );

    const distributorData = distributor.rows[0];

    if (!distributorData) {
      return res.status(400).json({ message: "Ambassador not found" });
    }

    // Check if distributor has any quantity left
    if (distributorData.quantity_remaining <= 0) {
      return res.status(400).json({
        message: "No more quantity available for this distributor",
      });
    }

    // Create customer
    const customer = await db.query(
      `INSERT INTO customer (name, mobile_number) 
       VALUES ($1, $2) RETURNING id`,
      [name, cleanMobileNumber]
    );
    const customerId = customer.rows[0].id;

    // Record the sale
    await db.query(
      `INSERT INTO sale (distributor_id, customer_id) 
       VALUES ($1, $2)`,
      [distributorData.id, customerId]
    );

    // Update distributor's remaining quantity
    await db.query(
      `UPDATE distributer 
       SET quantity_remaining = quantity_remaining - 1 
       WHERE id = $1`,
      [distributorData.id]
    );

    res.json({
      message: "Customer created and sale recorded successfully",
    });
  } catch (err) {
    console.error("Error in createCustomer:", err);
    res.status(500).json({ message: "Error creating recipient" });
  }
};

exports.customerslist = async (req, res) => {
  try {
    const query = `SELECT 
      s.created_at AS date_time_received,
      d.name AS ambassador_name,
      d.mobile_number AS ambassador_phone,
      c.name AS recipient_name,
      c.mobile_number AS recipient_phone
    FROM customer c
    JOIN sale s ON c.id = s.customer_id
    JOIN distributer d ON s.distributor_id = d.id
    ORDER BY s.created_at DESC;`;

    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching customers with distributors:", error);
    res.status(500).json({ error: "Error fetching recipients" });
  }
};
