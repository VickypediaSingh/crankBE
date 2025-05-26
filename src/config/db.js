// db.js

const { Pool } = require("pg");

// Update with your actual PostgreSQL config
const pool = new Pool({
  user: "postgres.vflgsdlxkdfnndgkeige",
  host: "aws-0-us-east-2.pooler.supabase.com",
  database: "postgres",
  password: "Crank@123456#1",
  port: 6543,
});

module.exports = pool;
