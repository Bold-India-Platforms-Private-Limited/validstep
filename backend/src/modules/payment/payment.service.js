'use strict';

const { db } = require('../../config/database');
const { redisGet, redisSet } = require('../../config/redis');
const { buildPayUParams, getPayUPaymentUrl, verifyPayUHash } = require('../../utils/payu');
const { generateVerificationHash } = require('../../utils/hash');
const { sendPaymentConfirmationEmail } = require('../../utils/email');
const { v4: uuidv4 } = require('uuid');
const env = require('../../config/env');

/**
 * Atomically generate a certificate serial and increment the batch counter
 */
async function generateCertificateSerial(batchId) {
  const result = await db.$transaction(async (tx) => {
    const batch = await tx.batch.update({
      where: { id: batchId },
      data: { id_counter: { increment: 1 } },
      select: { id_prefix: true, id_counter: true },
    });

    const paddedCounter = String(batch.id_counter).padStart(4, '0');
    return `${batch.id_prefix}-${paddedCounter}`;
  });

  return result;
}

/**
 * Initiate a payment for a batch certificate
 */
async function initiatePayment(userId, data) {
  const { batch_id } = data;

  // Get user details
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true },
  });

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  // Get batch details
  const batch = await db.batch.findUnique({
    where: { id: batch_id },
    include: {
      company: { select: { id: true, name: true } },
      program: { select: { type: true, name: true } },
    },
  });

  if (!batch) {
    throw Object.assign(new Error('Batch not found'), { statusCode: 404 });
  }

  if (!batch.is_active || batch.status === 'COMPLETED') {
    throw Object.assign(new Error('This batch is not accepting payments'), { statusCode: 400 });
  }

  // Check if user already has a paid order for this batch
  const existingPaidOrder = await db.order.findFirst({
    where: {
      user_id: userId,
      batch_id: batch_id,
      status: 'PAID',
    },
  });

  if (existingPaidOrder) {
    throw Object.assign(new Error('You already have a certificate for this batch'), { statusCode: 409 });
  }

  // Check for existing pending order (don't create duplicate)
  let existingPendingOrder = await db.order.findFirst({
    where: {
      user_id: userId,
      batch_id: batch_id,
      status: 'PENDING',
    },
  });

  // Generate certificate serial if no pending order exists
  let certificateSerial;
  let order;

  if (!existingPendingOrder) {
    certificateSerial = await generateCertificateSerial(batch_id);

    order = await db.order.create({
      data: {
        user_id: userId,
        batch_id: batch_id,
        company_id: batch.company.id,
        certificate_serial: certificateSerial,
        amount: batch.certificate_price,
        currency: batch.currency || 'INR',
        status: 'PENDING',
        payu_order_id: uuidv4(),
      },
    });
  } else {
    order = existingPendingOrder;
    certificateSerial = existingPendingOrder.certificate_serial;
  }

  // Build PayU transaction ID
  const txnid = `TXN-${order.id.replace(/-/g, '').slice(0, 16).toUpperCase()}`;

  // Update order with txn id
  await db.order.update({
    where: { id: order.id },
    data: { payu_txn_id: txnid },
  });

  const surl = `${env.BACKEND_URL}/api/payment/success`;
  const furl = `${env.BACKEND_URL}/api/payment/failure`;

  const payuParams = buildPayUParams({
    txnid,
    amount: String(parseFloat(batch.certificate_price).toFixed(2)),
    productinfo: `Certificate - ${batch.name} - ${batch.company.name}`,
    firstname: user.name.split(' ')[0],
    email: user.email,
    phone: user.phone || '',
    surl,
    furl,
    udf1: order.id,       // orderId
    udf2: userId,         // userId
    udf3: batch_id,       // batchId
    udf4: batch.company.id,
    udf5: '',
  });

  // Create payment record
  await db.payment.create({
    data: {
      order_id: order.id,
      payu_txn_id: txnid,
      amount: batch.certificate_price,
      currency: batch.currency || 'INR',
      status: 'INITIATED',
      gateway_response: { initiated_at: new Date().toISOString(), params: payuParams },
    },
  });

  return {
    paymentUrl: getPayUPaymentUrl(),
    payuParams,
    orderId: order.id,
    txnid,
    amount: batch.certificate_price,
  };
}

/**
 * Handle PayU success redirect
 */
async function handlePaymentSuccess(responseData) {
  const { txnid, status, hash, mihpayid } = responseData;

  // Verify hash
  const isValidHash = verifyPayUHash(responseData);
  if (!isValidHash) {
    throw Object.assign(new Error('Payment hash verification failed'), { statusCode: 400 });
  }

  const orderId = responseData.udf1;
  if (!orderId) {
    throw Object.assign(new Error('Order ID missing from payment response'), { statusCode: 400 });
  }

  return processPaymentResponse(orderId, txnid, status, mihpayid, responseData);
}

/**
 * Handle PayU failure redirect
 */
async function handlePaymentFailure(responseData) {
  const { txnid, status, mihpayid } = responseData;
  const orderId = responseData.udf1;

  if (!orderId) {
    throw Object.assign(new Error('Order ID missing from payment response'), { statusCode: 400 });
  }

  // Update order to FAILED
  await db.order.update({
    where: { id: orderId },
    data: { status: 'FAILED' },
  });

  // Update payment record
  await db.payment.updateMany({
    where: { order_id: orderId },
    data: {
      status: 'FAILURE',
      payu_txn_id: txnid,
      payu_payment_id: mihpayid || null,
      gateway_response: responseData,
    },
  });

  return { status: 'failed', orderId };
}

/**
 * Handle PayU webhook
 */
async function handleWebhook(webhookData) {
  const { txnid, status, hash, mihpayid } = webhookData;

  // Verify hash signature
  const isValidHash = verifyPayUHash(webhookData);
  if (!isValidHash) {
    throw Object.assign(new Error('Webhook hash verification failed'), { statusCode: 400 });
  }

  const orderId = webhookData.udf1;
  if (!orderId) {
    throw Object.assign(new Error('Order ID missing from webhook'), { statusCode: 400 });
  }

  // Idempotency check - check if already processed
  const idempotencyKey = `webhook:processed:${txnid}`;
  const alreadyProcessed = await redisGet(idempotencyKey);
  if (alreadyProcessed) {
    console.log(`Webhook for txn ${txnid} already processed`);
    return { status: 'already_processed', orderId };
  }

  const result = await processPaymentResponse(orderId, txnid, status, mihpayid, webhookData, true);

  // Mark as processed for 24 hours (idempotency)
  await redisSet(idempotencyKey, '1', 86400);

  return result;
}

/**
 * Core payment processing logic
 */
async function processPaymentResponse(orderId, txnid, status, mihpayid, responseData, isWebhook = false) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      batch: {
        include: {
          program: { select: { type: true, name: true } },
          company: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!order) {
    throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  }

  // Don't process if already paid
  if (order.status === 'PAID' && status === 'success') {
    return { status: 'already_paid', orderId };
  }

  const paymentStatus = status === 'success' ? 'SUCCESS' : 'FAILURE';
  const orderStatus = status === 'success' ? 'PAID' : 'FAILED';

  // Update payment record
  await db.payment.updateMany({
    where: { order_id: orderId },
    data: {
      status: paymentStatus,
      payu_txn_id: txnid,
      payu_payment_id: mihpayid || null,
      gateway_response: responseData,
      ...(isWebhook && { webhook_payload: responseData }),
    },
  });

  // Update order status
  await db.order.update({
    where: { id: orderId },
    data: {
      status: orderStatus,
      payu_txn_id: txnid,
    },
  });

  // If payment successful, create certificate record
  if (status === 'success') {
    const existingCert = await db.certificate.findUnique({
      where: { order_id: orderId },
    });

    if (!existingCert) {
      const verificationHash = generateVerificationHash(
        order.certificate_serial,
        order.user_id,
        order.batch_id
      );

      // Get active template
      const template = await db.certificateTemplate.findFirst({
        where: { batch_id: order.batch_id, is_active: true },
        orderBy: { created_at: 'desc' },
      });

      await db.certificate.create({
        data: {
          order_id: orderId,
          user_id: order.user_id,
          batch_id: order.batch_id,
          company_id: order.company_id,
          certificate_serial: order.certificate_serial,
          template_id: template?.id || null,
          is_issued: false,
          verification_hash: verificationHash,
        },
      });
    }
  }

  // Send payment confirmation email on success
  if (status === 'success') {
    try {
      await sendPaymentConfirmationEmail({
        userName: order.user.name,
        userEmail: order.user.email,
        batchName: order.batch.name,
        companyName: order.batch.company.name,
        amount: order.amount,
        currency: order.currency,
        certificateSerial: order.certificate_serial,
        txnId: txnid,
        paidAt: new Date(),
        orderId: order.id,
      });
    } catch (emailErr) {
      console.error('Payment email failed (non-fatal):', emailErr.message);
    }
  }

  return { status: orderStatus.toLowerCase(), orderId };
}

/**
 * Get payment status for an order
 */
async function getPaymentStatus(userId, orderId) {
  const order = await db.order.findFirst({
    where: { id: orderId, user_id: userId },
    include: {
      payments: {
        orderBy: { created_at: 'desc' },
        take: 1,
      },
      certificate: {
        select: {
          id: true,
          is_issued: true,
          certificate_serial: true,
          verification_hash: true,
        },
      },
    },
  });

  if (!order) {
    throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  }

  return order;
}

module.exports = {
  initiatePayment,
  handlePaymentSuccess,
  handlePaymentFailure,
  handleWebhook,
  getPaymentStatus,
};
