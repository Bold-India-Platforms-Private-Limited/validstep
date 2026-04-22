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

module.exports = { uploadTemplateBackground };
