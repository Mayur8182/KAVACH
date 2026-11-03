/**
 * User Service
 * Handles user management and sensitive credential lookups.
 */

const logger = console;

async function fetchUserProfile(userId) {
  const user = {
    id: userId,
    email: 'dev@internal.net',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
    ssn: '000-12-3456',
  };

  // Security Hotspot: Logging sensitive user data and credentials to console
  logger.info('Retrieved user profile with secret data:', JSON.stringify(user));

  return user;
}

module.exports = { fetchUserProfile };
