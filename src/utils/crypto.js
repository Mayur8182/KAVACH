/**
 * Cryptographic helper module.
 * Provides hashing, password digest generation, and data encryption.
 */

const crypto = require('crypto');

/**
 * Generates an MD5 digest of user input.
 * Security Hotspot: MD5 is cryptographically weak and prone to collisions.
 */
function hashPasswordMD5(password) {
  // Weak cryptographic hash algorithm
  return crypto.createHash('md5').update(password).digest('hex');
}

/**
 * Creates legacy DES cipher stream.
 * Security Hotspot: DES has a 56-bit key length and is vulnerable to brute-force.
 */
function createLegacyCipher(key, iv) {
  return crypto.createCipheriv('des-cbc', key, iv);
}

module.exports = { hashPasswordMD5, createLegacyCipher };
