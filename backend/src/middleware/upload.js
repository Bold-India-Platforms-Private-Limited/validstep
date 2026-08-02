'use strict';

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/templates'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const name = `tmpl-${crypto.randomUUID()}${ext}`;
    cb(null, name);
  },
});

function imageFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(Object.assign(new Error('Only JPG, PNG, or WebP images allowed'), { statusCode: 400 }));
}

const uploadTemplateBackground = multer({
  storage: templateStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('background');

const accountingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/accounting'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.xlsx';
    const name = `import-${crypto.randomUUID()}${ext}`;
    cb(null, name);
  },
});

function accountingFileFilter(req, file, cb) {
  const allowedExt = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExt.includes(ext)) return cb(null, true);
  cb(Object.assign(new Error('Only .xlsx, .xls, or .csv files allowed'), { statusCode: 400 }));
}

const uploadAccountingFile = multer({
  storage: accountingStorage,
  fileFilter: accountingFileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
}).single('file');

const userImportStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/user-imports'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.xlsx';
    const name = `userimport-${crypto.randomUUID()}${ext}`;
    cb(null, name);
  },
});

function userImportFileFilter(req, file, cb) {
  const allowedExt = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExt.includes(ext)) return cb(null, true);
  cb(Object.assign(new Error('Only .xlsx, .xls, or .csv files allowed'), { statusCode: 400 }));
}

const uploadUserImportFile = multer({
  storage: userImportStorage,
  fileFilter: userImportFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
}).single('file');

function customCertificateFileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(Object.assign(new Error('Only JPG, PNG, or PDF files allowed'), { statusCode: 400 }));
}

// Memory storage — the uploaded file is composited (badge overlay) in-process
// and pushed straight to R2, it's never meant to land on local disk.
const uploadCustomCertificate = multer({
  storage: multer.memoryStorage(),
  fileFilter: customCertificateFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
}).single('certificate');

// Same shape as uploadCustomCertificate, used by the badge-position live-preview
// endpoint — nothing is persisted, so it's a separate export purely for clarity at the route.
const previewCertificateBadgeUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: customCertificateFileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
}).single('certificate');

module.exports = { uploadTemplateBackground, uploadAccountingFile, uploadUserImportFile, uploadCustomCertificate, previewCertificateBadgeUpload };
