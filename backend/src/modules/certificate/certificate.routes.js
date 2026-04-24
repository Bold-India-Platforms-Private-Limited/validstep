'use strict';

const { Router } = require('express');
const controller = require('./certificate.controller');
const { requireUser } = require('../../middleware/auth');
const { generalLimiter } = require('../../middleware/rateLimiter');

// Public routes
const publicRouter = Router();
publicRouter.get('/verify/:hash', controller.verifyCertificate);

// User routes
const userRouter = Router();
userRouter.use(requireUser);
userRouter.use(generalLimiter);
userRouter.get('/', controller.getUserCertificates);
userRouter.get('/:id', controller.getCertificateById);
userRouter.get('/:id/download', controller.downloadCertificate);

module.exports = { publicRouter, userRouter };
