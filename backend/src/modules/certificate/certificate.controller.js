'use strict';

const certificateService = require('./certificate.service');
const { logDeliveryEvent } = require('../../utils/deliveryLog');
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
    return sendSuccess(res, { certificates }, 'Certificates retrieved successfully');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

async function getCertificateById(req, res) {
  try {
    const cert = await certificateService.getCertificateById(req.user.id, req.params.id);
    return sendSuccess(res, cert, 'Certificate retrieved successfully');
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
      logDeliveryEvent(req.user.id, 'CERTIFICATE_DOWNLOADED', result.order_id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate-${result.certificate_serial}.pdf"`);
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', () => sendError(res, 'Failed to read certificate file', 500));
      return fileStream.pipe(res);
    }

    // Not a locally-generated PDF — admin-uploaded certificates live on R2. Proxy the file
    // through the backend (server-to-R2 fetches aren't subject to browser CORS) so the
    // response can carry a Content-Disposition header and trigger a real download.
    if (result.certificate_url) {
      const remoteRes = await fetch(result.certificate_url);
      if (!remoteRes.ok) {
        return sendError(res, 'Failed to fetch certificate file', 502);
      }
      logDeliveryEvent(req.user.id, 'CERTIFICATE_DOWNLOADED', result.order_id);
      const ext = path.extname(new URL(result.certificate_url).pathname).slice(1) || 'jpg';
      const contentType = remoteRes.headers.get('content-type') || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="certificate-${result.certificate_serial}.${ext}"`);
      const buffer = Buffer.from(await remoteRes.arrayBuffer());
      return res.send(buffer);
    }

    // No file available yet — return JSON with URL as fallback
    return sendSuccess(res, result, 'Certificate download info retrieved');
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  verifyCertificate,
  getUserCertificates,
  getCertificateById,
  downloadCertificate,
};
