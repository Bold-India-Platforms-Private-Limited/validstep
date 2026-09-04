'use strict';

const { Router } = require('express');
const controller = require('./publicCertRepo.controller');
const { uploadPublicCertSheet } = require('../../middleware/upload');
const { publicCertLookupLimiter } = require('../../middleware/rateLimiter');

// Mounted under /api/admin/certificate-repo — inherits requireSuperAdmin, generalLimiter and
// the review-account read-only guard from admin.routes.js.
const adminRouter = Router();
adminRouter.post('/match', uploadPublicCertSheet, controller.match);
adminRouter.post('/start', controller.start);
adminRouter.get('/status/:jobId', controller.status);
adminRouter.get('/records', controller.records);

// Mounted under /api/public-certs — no auth, its own rate limiter.
const publicRouter = Router();
publicRouter.get('/lookup', publicCertLookupLimiter, controller.lookup);

module.exports = { adminRouter, publicRouter };
