const { Readable } = require("stream");
const csv = require("csv-parser");
const bcrypt = require("bcrypt");
const { Parser } = require("json2csv");
const pool = require("../config/db");

async function updateDistributorUnits(
  distributorId,
  newAllocated,
  newRemaining
) {
  try {
    console.log("Updating distributor:", {
      distributorId,
      newAllocated,
      newRemaining,
    });

    // Verify the distributor exists
    const checkResult = await pool.query(
      "SELECT id FROM distributer WHERE id = $1",
      [distributorId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error(`Distributor with ID ${distributorId} not found`);
    }

    // Update the distributor
    const updateResult = await pool.query(
      "UPDATE distributer SET quantity_alloted = $1, quantity_remaining = $2 WHERE id = $3 RETURNING *",
      [newAllocated, newRemaining, distributorId]
    );

    console.log("Update successful:", updateResult.rows[0]);

    return {
      success: true,
      distributor: updateResult.rows[0],
    };
  } catch (err) {
    console.error("Database error:", err);
    throw err;
  }
}
//
async function assignAdditionalUnits(distributorId, additionalUnits) {
  try {
    // First verify the distributor exists
    const checkResult = await pool.query(
      "SELECT quantity_alloted, quantity_remaining FROM distributer WHERE id = $1",
      [distributorId]
    );

    if (checkResult.rows.length === 0) {
      throw new Error("Distributor not found");
    }

    const currentAlloted = checkResult.rows[0].quantity_alloted;
    const currentRemaining = checkResult.rows[0].quantity_remaining;

    // Calculate new values
    const newAlloted = currentAlloted + additionalUnits;
    const newRemaining = currentRemaining + additionalUnits;

    // Update the distributor
    await pool.query(
      "UPDATE distributer SET quantity_alloted = $1, quantity_remaining = $2 WHERE id = $3",
      [newAlloted, newRemaining, distributorId]
    );

    return {
      success: true,
      newAlloted,
      newRemaining,
    };
  } catch (err) {
    console.error("Error assigning additional units:", err);
    throw err;
  }
}
// OLD (FETCHED ALL DATA)
// async function getDailyRecipients() {
//   try {
//     const result = await pool.query(
//       `SELECT
//     s.created_at AS date_time_received,
//     d.name AS ambassador_name,
//     d.mobile_number AS ambassador_phone,
//     c.name AS recipient_name,
//     c.mobile_number AS recipient_phone
//   FROM customer c
//   JOIN sale s ON c.id = s.customer_id
//   JOIN distributer d ON s.distributor_id = d.id
//   ORDER BY s.created_at DESC`
//     );

//     if (result && result.rows) {
//       result.rows.forEach((element) => {
//         element.ambassador_phone = formatPhoneNumber(element.ambassador_phone);
//         element.recipient_phone = formatPhoneNumber(element.recipient_phone);
//         element.date_time_received = new Date(
//           element.date_time_received
//         ).toLocaleString("en-IN", {
//           timeZone: "Asia/Kolkata",
//         });
//       });
//     }

//     return result.rows;
//   } catch (err) {
//     console.error("Error fetching recipients summary:", err);
//     return err;
//   }
// }
// NEW
async function getDailyRecipients() {
  try {
    const result = await pool.query(
      `SELECT
        s.created_at AS date_time_received,
        d.name AS ambassador_name,
        d.mobile_number AS ambassador_phone,
        c.name AS recipient_name,
        c.mobile_number AS recipient_phone
      FROM customer c
      JOIN sale s ON c.id = s.customer_id
      JOIN distributer d ON s.distributor_id = d.id
      WHERE s.created_at::date = CURRENT_DATE
      ORDER BY s.created_at DESC`
    );

    if (result && result.rows) {
      result.rows.forEach((element) => {
        element.ambassador_phone = formatPhoneNumber(element.ambassador_phone);
        element.recipient_phone = formatPhoneNumber(element.recipient_phone);
        element.date_time_received = new Date(
          element.date_time_received
        ).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        });
      });
    }

    return result.rows;
  } catch (err) {
    console.error("Error fetching recipients summary:", err);
    return err;
  }
}
// INDIAN TIMING
// async function getDailyRecipients() {
//   try {
//     const result = await pool.query(
//       `SELECT
//         s.created_at AS date_time_received,
//         d.name AS ambassador_name,
//         d.mobile_number AS ambassador_phone,
//         c.name AS recipient_name,
//         c.mobile_number AS recipient_phone
//       FROM customer c
//       JOIN sale s ON c.id = s.customer_id
//       JOIN distributer d ON s.distributor_id = d.id
//       WHERE s.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'::date = CURRENT_DATE AT TIME ZONE 'Asia/Kolkata'::date
//       ORDER BY s.created_at DESC`
//     );

//     if (result && result.rows) {
//       result.rows.forEach((element) => {
//         element.ambassador_phone = formatPhoneNumber(element.ambassador_phone);
//         element.recipient_phone = formatPhoneNumber(element.recipient_phone);
//         element.date_time_received = new Date(
//           element.date_time_received
//         ).toLocaleString("en-IN", {
//           timeZone: "Asia/Kolkata",
//         });
//       });
//     }

//     return result.rows;
//   } catch (err) {
//     console.error("Error fetching recipients summary:", err);
//     return err;
//   }
// }
//
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
async function handleDistributorCSVBuffer(buffer) {
  const distributors = [];

  return new Promise((resolve, reject) => {
    const stream = Readable.from(buffer);

    stream
      .pipe(csv())
      .on("data", (row) => {
        let mobile = row.mobile_number?.trim();
        const quantity = row.quantity_alloted?.trim();

        if (mobile && quantity) {
          if (/^\d{10}$/.test(mobile)) {
            mobile = `+91${mobile}`;
          }

          distributors.push({
            mobile_number: mobile,
            quantity_alloted: parseInt(quantity, 10),
          });
        }
      })
      .on("end", async () => {
        try {
          const inserted = [];

          for (const distributor of distributors) {
            // Check if email already exists
            const existing = await pool.query(
              "SELECT id FROM distributer WHERE mobile_number = $1",
              [distributor.mobile_number]
            );

            if (existing.rows.length > 0) {
              continue; // Skip if email already exists
            }

            // Insert into DB
            await pool.query(
              "INSERT INTO distributer (mobile_number, quantity_alloted) VALUES ($1, $2)",
              [distributor.mobile_number, distributor.quantity_alloted]
            );
            console.log(distributor.mobile_number);
            console.log(distributor.quantity_alloted);
            console.log("hello inserted");
            //send mail to distributor
            //await sendWelcomeEmail(distributor.mobile_number);

            inserted.push({
              mobile_number: distributor.mobile_number,
              quantity: distributor.quantity_alloted,
            });
          }

          resolve(inserted);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject);
  });
}
//
async function createDistributor({
  name,
  email,
  phone_number,
  units_assigned,
}) {
  if (!name || !email || !phone_number || !units_assigned) {
    throw { status: 400, message: "All fields are required" };
  }

  let mobile = phone_number.trim();
  if (/^\d{10}$/.test(mobile)) {
    mobile = `+91${mobile}`;
  }
  // 1. First check if this is an existing recipient
  // Ambassadors cannot register as recipients now, ka ulta
  const existingCustomer = await pool.query(
    "SELECT id FROM customer WHERE mobile_number = $1",
    [mobile]
  );

  if (existingCustomer.rows.length > 0) {
    throw {
      status: 400,
      message: "Recipients cannot be registered as ambassadors",
    };
  }

  const existing = await pool.query(
    "SELECT id FROM distributer WHERE mobile_number = $1 OR email = $2",
    [mobile, email]
  );

  if (existing.rows.length > 0) {
    throw {
      status: 409,
      message: "An ambassador already exists with these credentials",
    };
  }

  await pool.query(
    "INSERT INTO distributer (name, email, mobile_number, quantity_alloted, quantity_remaining) VALUES ($1, $2, $3, $4, $5)",
    [name, email, mobile, units_assigned, units_assigned]
  );

  // Optional: send welcome email or SMS
  //await sendWelcomeEmail(name, email, mobile);

  return { message: "Ambassador created successfully" };
}
//
const generateDistributorsCSV = async () => {
  const result = await pool.query(
    `SELECT name, email, mobile_number AS phone_number, created_at, quantity_alloted AS units_assigned 
     FROM distributer 
     ORDER BY created_at DESC`
  );

  const distributors = result.rows.map((row) => ({
    name: row.name,
    email: row.email,
    phone_number: formatPhoneNumber(row.phone_number),
    date_time_assigned: new Date(row.created_at).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    }),
    units_assigned: row.units_assigned,
  }));

  const fields = [
    "name",
    "email",
    "phone_number",
    "date_time_assigned",
    "units_assigned",
  ];

  const parser = new Parser({ fields });
  const csv = parser.parse(distributors);

  return csv;
};
//
const generateRecipientsCSV = async () => {
  const result = await pool.query(
    `SELECT 
    s.created_at AS date_time_received,
    d.name AS ambassador_name,
    d.mobile_number AS ambassador_phone,
    c.name AS recipient_name,
    c.mobile_number AS recipient_phone
  FROM customer c
  JOIN sale s ON c.id = s.customer_id
  JOIN distributer d ON s.distributor_id = d.id
  ORDER BY s.created_at DESC`
  );

  const recipients = result.rows.map((row) => ({
    ambassador_name: row.ambassador_name,
    ambassador_phone_number: formatPhoneNumber(row.ambassador_phone),
    recipient_name: row.recipient_name,
    recipient_phone_number: formatPhoneNumber(row.recipient_phone),
    date_time_assigned: new Date(row.date_time_received).toLocaleString(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
      }
    ),
    units_assigned: row.units_assigned,
  }));

  const fields = [
    "ambassador_name",
    "ambassador_phone_number",
    "recipient_name",
    "recipient_phone_number",
    "date_time_assigned",
  ];

  const parser = new Parser({ fields });
  const csv = parser.parse(recipients);

  return csv;
};
//
async function downloadDistributors() {
  try {
    const csv = await generateDistributorsCSV();
    return csv;
  } catch (err) {
    console.error("CSV Download Error:", err);
    res.status(500).json({ message: "Error generating CSV" });
  }
}
//
async function downloadRecipients() {
  try {
    const csv = await generateRecipientsCSV();
    return csv;
  } catch (err) {
    console.error("CSV Download Error:", err);
    return err;
  }
}
//
async function getDistributorCount() {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) AS total_distributors FROM distributer
    `);

    return parseInt(result.rows[0].total_distributors, 10);
  } catch (err) {
    console.error("Error fetching ambassadors count:", err);
    return err;
  }
}
//
async function getAllDistributorsSummary() {
  try {
    const result = await pool.query(`
      SELECT
        d.id,
        d.name,
        d.mobile_number,
        d.quantity_alloted,
        d.quantity_remaining,
        (d.quantity_alloted - d.quantity_remaining) AS units_sold
      FROM distributer d
      ORDER BY d.created_at DESC
    `);

    console.log(result);

    if (result)
      result.rows.forEach((element) => {
        element.mobile_number = formatPhoneNumber(element.mobile_number);
      });

    return result.rows;
  } catch (err) {
    console.error("Error fetching ambassadors summary:", err);
    return err;
  }
}
//
async function getADistributorSummary(distributorId) {
  try {
    const result = await pool.query(
      `
      SELECT 
        id,
        name,
        mobile_number,
        quantity_alloted,
        quantity_remaining,
        (quantity_alloted - quantity_remaining) AS units_sold
      FROM distributer
      WHERE id = $1
      `,
      [distributorId]
    );

    console.log(result);
    return result.rows[0];
  } catch (err) {
    console.error("Error fetching ambassador summary:", err);
    return err;
  }
}
//
module.exports = {
  handleDistributorCSVBuffer,
  createDistributor,
  downloadDistributors,
  getAllDistributorsSummary,
  downloadRecipients,
  getADistributorSummary,
  getDistributorCount,
  getDailyRecipients,
  assignAdditionalUnits,
  updateDistributorUnits,
};
