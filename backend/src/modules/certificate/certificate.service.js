'use strict';

const { db } = require('../../config/database');
const { isRedisAvailable } = require('../../config/redis');
const { generateCertificate } = require('./generator');
const { generateVerificationHash } = require('../../utils/hash');
const { sendCertificateIssuedEmail } = require('../../utils/email');
const path = require('path');
const fs = require('fs').promises;
const env = require('../../config/env');

// BullMQ Queue setup
let certificateQueue = null;

function getCertificateQueue() {
  if (!certificateQueue) {
    const { Queue } = require('bullmq');
    certificateQueue = new Queue('certificate-generation', {
      connection: {
        host: new URL(env.REDIS_URL).hostname,
        port: parseInt(new URL(env.REDIS_URL).port || '6379'),
        password: new URL(env.REDIS_URL).password || undefined,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return certificateQueue;
}

/**
 * Add a certificate generation job to the queue
 */
async function addCertificateJob(jobData) {
  if (!isRedisAvailable()) {
    // No Redis — process synchronously
    try {
      await processCertificateJob(jobData);
    } catch (err) {
      console.error('Sync certificate processing failed:', err.message);
    }
    return;
  }
  try {
    const queue = getCertificateQueue();
    const job = await queue.add('generate-certificate', jobData, {
      jobId: `cert-${jobData.orderId}`,
    });
    return job.id;
  } catch (err) {
    console.error('Failed to add certificate job to queue:', err.message);
    try {
      await processCertificateJob(jobData);
    } catch (processErr) {
      console.error('Fallback certificate processing failed:', processErr.message);
    }
  }
}

/**
 * Process a certificate generation job
 * This is called by the BullMQ worker
 */
async function processCertificateJob(jobData) {
  const { orderId, batchId, companyId, templateId } = jobData;

  // Get order with all related data
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      batch: {
        include: {
          program: { select: { type: true, name: true } },
          company: { select: { id: true, name: true, logo_url: true } },
        },
      },
      certificate: true,
    },
  });

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  if (!order.certificate) {
    throw new Error(`Certificate record for order ${orderId} not found`);
  }

  // Get template
  let template = null;
  if (templateId) {
    template = await db.certificateTemplate.findUnique({ where: { id: templateId } });
  }

  if (!template) {
    template = await db.certificateTemplate.findFirst({
      where: { batch_id: batchId, is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  // Default template config if none exists
  if (!template) {
    template = {
      template_type: 'CLASSIC',
      background_color: '#FFFFFF',
      accent_color: '#1a237e',
      show_logo: true,
      show_signature: false,
    };
  }

  const certificateData = {
    userName: order.user.name,
    companyName: order.batch.company.name,
    role: order.batch.role,
    batchName: order.batch.name,
    startDate: order.batch.start_date,
    endDate: order.batch.end_date,
    certificateSerial: order.certificate_serial,
    programType: order.batch.program.type,
    verificationHash: order.certificate.verification_hash,
    companyLogoUrl: order.batch.company.logo_url,
  };

  // Generate PDF
  const pdfBuffer = await generateCertificate(certificateData, template);

  // Save PDF to disk (in production, this would be uploaded to S3/GCS)
  const uploadsDir = path.join(__dirname, '../../../uploads/certificates');
  await fs.mkdir(uploadsDir, { recursive: true });

  const fileName = `${order.certificate.verification_hash}.pdf`;
  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, pdfBuffer);

  const certificateUrl = `${env.STORAGE_BASE_URL}/certificates/${fileName}`;

  // Update certificate record
  await db.certificate.update({
    where: { id: order.certificate.id },
    data: {
      certificate_url: certificateUrl,
      is_issued: true,
      issued_at: new Date(),
      template_id: template.id || null,
    },
  });

  console.log(`Certificate generated for order ${orderId}: ${certificateUrl}`);

  // Send email notification to user
  try {
    const verificationHash = order.certificate.verification_hash;
    await sendCertificateIssuedEmail({
      userName: order.user.name,
      userEmail: order.user.email,
      batchName: order.batch.name,
      companyName: order.batch.company.name,
      programType: order.batch.program.type,
      role: order.batch.role,
      startDate: order.batch.start_date,
      endDate: order.batch.end_date,
      certificateSerial: order.certificate_serial,
      verificationHash,
      verificationUrl: `${env.FRONTEND_URL}/verify/${verificationHash}`,
      downloadUrl: certificateUrl,
    });
  } catch (emailErr) {
    console.error('Certificate email failed (non-fatal):', emailErr.message);
  }

  return { certificateUrl, orderId };
}

/**
 * Start the BullMQ worker for certificate generation
 */
function startCertificateWorker() {
  // Skip in HTTP cluster workers — only run in the dedicated worker.js process
  if (parseInt(process.env.PAYMENT_WORKER_CONCURRENCY || '10', 10) === 0) return null;

  if (!isRedisAvailable()) {
    console.log('[Worker] Redis not available — certificate worker skipped (sync fallback active)');
    return null;
  }
  try {
    const { Worker } = require('bullmq');
    const redisUrl = new URL(env.REDIS_URL);

    const worker = new Worker(
      'certificate-generation',
      async (job) => {
        console.log(`Processing certificate job ${job.id} for order ${job.data.orderId}`);
        return processCertificateJob(job.data);
      },
      {
        connection: {
          host: redisUrl.hostname,
          port: parseInt(redisUrl.port || '6379'),
          password: redisUrl.password || undefined,
        },
        concurrency: 3,
      }
    );

    worker.on('completed', (job, result) => {
      console.log(`Certificate job ${job.id} completed:`, result?.certificateUrl);
    });

    worker.on('failed', (job, err) => {
      console.error(`Certificate job ${job?.id} failed:`, err.message);
    });

    console.log('Certificate generation worker started');
    return worker;
  } catch (err) {
    console.error('Failed to start certificate worker:', err.message);
    return null;
  }
}

/**
 * Verify a certificate by hash
 */
async function verifyCertificate(verificationHash, ipAddress, userAgent) {
  const certificate = await db.certificate.findUnique({
    where: { verification_hash: verificationHash },
    include: {
      user: { select: { name: true, email: true } },
      batch: {
        include: {
          program: { select: { type: true, name: true } },
          company: { select: { name: true, logo_url: true, website: true } },
        },
      },
      order: { select: { amount: true, certificate_serial: true, created_at: true } },
    },
  });

  if (!certificate) {
    throw Object.assign(new Error('Certificate not found'), { statusCode: 404 });
  }

  // Log verification attempt
  await db.verificationLog.create({
    data: {
      certificate_id: certificate.id,
      ip_address: ipAddress,
      user_agent: userAgent,
    },
  });

  return {
    valid: true,
    certificate: {
      serial: certificate.certificate_serial,
      holder_name: certificate.user.name,
      program_type: certificate.batch.program.type,
      program_name: certificate.batch.program.name,
      batch_name: certificate.batch.name,
      role: certificate.batch.role,
      start_date: certificate.batch.start_date,
      end_date: certificate.batch.end_date,
      company: certificate.batch.company.name,
      issued_at: certificate.issued_at,
      is_issued: certificate.is_issued,
    },
  };
}

/**
 * Get user's certificates
 */
async function getUserCertificates(userId) {
  const certificates = await db.certificate.findMany({
    where: { user_id: userId },
    include: {
      batch: {
        include: {
          program: { select: { type: true, name: true } },
          company: { select: { name: true, logo_url: true } },
        },
      },
      order: { select: { amount: true, created_at: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  return certificates;
}

/**
 * Download a certificate (get URL or regenerate)
 */
async function downloadCertificate(userId, certificateId) {
  const certificate = await db.certificate.findFirst({
    where: { id: certificateId, user_id: userId },
    include: {
      batch: {
        include: {
          program: { select: { type: true } },
          company: { select: { name: true } },
        },
      },
    },
  });

  if (!certificate) {
    throw Object.assign(new Error('Certificate not found'), { statusCode: 404 });
  }

  if (!certificate.is_issued) {
    throw Object.assign(new Error('Certificate has not been issued yet'), { statusCode: 403 });
  }

  if (certificate.batch.status !== 'COMPLETED' && !certificate.is_issued) {
    throw Object.assign(new Error('Certificate is not yet available for download'), { statusCode: 403 });
  }

  // Increment download count
  await db.certificate.update({
    where: { id: certificateId },
    data: { download_count: { increment: 1 } },
  });

  return {
    certificate_url: certificate.certificate_url,
    certificate_serial: certificate.certificate_serial,
    verification_hash: certificate.verification_hash,
  };
}

module.exports = {
  addCertificateJob,
  processCertificateJob,
  startCertificateWorker,
  verifyCertificate,
  getUserCertificates,
  downloadCertificate,
};
