'use strict';

const certificateService = require('./certificate.service');
const { sendSuccess, sendError } = require('../../utils/apiResponse');

async function verifyCertificate(req, res) {
  try {
    const { hash } = req.params;
    const ipAddress = req.ip || req.headers['x-forwarded-for'];
    const userAgent = req.headers['user-agent'];

    const result = await certificateService.verifyCertificate(hash, ipAddress, userAgent);
    return sendSuccess(res, result, 'Certificate verified successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getUserCertificates(req, res) {
  try {
    const certificates = await certificateService.getUserCertificates(req.user.id);
    return sendSuccess(res, certificates, 'Certificates retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function downloadCertificate(req, res) {
  try {
    const result = await certificateService.downloadCertificate(req.user.id, req.params.id);

    // Try to serve the PDF file directly
    const path = require('path');
    const fs = require('fs');
    const fileName = `${result.verification_hash}.pdf`;
    const filePath = path.join(__dirname, '../../../uploads/certificates', fileName);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate-${result.certificate_serial}.pdf"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', () => sendError(res, 'Failed to read certificate file', 500));
      return fileStream.pipe(res);
    }

    // PDF not generated yet — return JSON with URL as fallback
    return sendSuccess(res, result, 'Certificate download info retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  verifyCertificate,
  getUserCertificates,
  downloadCertificate,
};
