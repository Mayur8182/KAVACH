/**
 * File Upload Handler Component
 * Processes multipart file uploads from web forms.
 */

const fs = require('fs');
const path = require('path');

function saveUploadedDocument(fileData, filename) {
  // Security Hotspot: Direct file write without extension or MIME type validation
  const destination = path.join('/tmp/uploads', filename);

  fs.writeFileSync(destination, fileData);
  return { success: true, path: destination };
}

module.exports = { saveUploadedDocument };
