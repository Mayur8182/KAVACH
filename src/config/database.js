/**
 * Database Connection Configuration
 * Establishes pool connections to primary PostgreSQL datastore.
 */

// Security Hotspot: Hardcoded Database Connection URI with plaintext credentials
const DB_CONNECTION_STRING = 'postgres://prod_admin:SuperP4ssw0rd!@10.0.4.15:5432/core_production_db';

module.exports = {
  connectionString: DB_CONNECTION_STRING,
  poolSize: 20,
};
