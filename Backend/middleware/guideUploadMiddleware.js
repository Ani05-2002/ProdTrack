// Imports Multer to handle multipart/form-data file uploads.
const multer = require("multer");

// Imports Node's path module for safely handling file extensions.
const path = require("path");

// Imports Node's file system module so the uploads folder can be created automatically.
const fs = require("fs");

// Defines the folder where all uploaded guide files will be stored.
const uploadDirectory = path.join(__dirname, "..", "uploads", "guides");

// Creates the uploads/guides folder if it does not already exist.
fs.mkdirSync(uploadDirectory, { recursive: true });

// Configures how uploaded guide files are stored on disk.
const storage = multer.diskStorage({
  // Saves every guide inside backend/uploads/guides.
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  // Generates a unique filename to prevent one upload overwriting another.
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    // Creates a unique filename using the current timestamp and random number.
    const uniqueName = `guide-${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${extension}`;

    cb(null, uniqueName);
  },
});

// Validates uploaded guide files before saving them.
// Validates uploaded PDF and Microsoft Word guide files.
const fileFilter = (req, file, cb) => {
  // Reads the uploaded file extension in lowercase.
  const extension = path.extname(file.originalname).toLowerCase();

  // Defines the accepted extensions and their MIME types.
  const allowedTypes = {
    // Allows PDF guide files.
    ".pdf": ["application/pdf"],

    // Allows old Microsoft Word guide files.
    ".doc": ["application/msword"],

    // Allows modern Microsoft Word guide files.
    ".docx": [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],

    // Allows old Microsoft Excel guide files.
    ".xls": [
      "application/vnd.ms-excel",
    ],

    // Allows modern Microsoft Excel guide files.
    ".xlsx": [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  };

  // Checks that both the extension and MIME type are allowed.
  const isValidFile = allowedTypes[extension]?.includes(file.mimetype);

  // Accepts supported guide files.
  if (isValidFile) {
    return cb(null, true);
  }

  // Rejects unsupported file types.
  return cb(
    new Error(
      "Only PDF, DOC, DOCX, XLS and XLSX guide files are allowed"
    )
  );
};

// Creates the reusable guide upload middleware.
const guideUpload = multer({
  storage,

  // Limits each guide PDF to 10 MB.
  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter,
});

// Exports the middleware so guideRoutes.js can use it.
module.exports = guideUpload;