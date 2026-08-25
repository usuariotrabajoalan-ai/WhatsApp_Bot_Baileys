const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Check connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database', err.stack);
  } else {
    console.log('Connected to PostgreSQL successfully');
    
    // Create the whatsapp_auth table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS whatsapp_auth (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB
      );
    `;
    
    client.query(createTableQuery, (err) => {
      release();
      if (err) {
        console.error('Error creating whatsapp_auth table', err.stack);
      } else {
        console.log('whatsapp_auth table ready');
      }
    });
  }
});

module.exports = { pool };
