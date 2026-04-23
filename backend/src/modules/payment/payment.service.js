'use strict';

/**
 * Payment Service
 * ───────────────
 * Handles PayU payment lifecycle with async BullMQ verification.
 *
 * Key design decisions for high throughput (10k tx/5min):
 *
 * 1. ASYNC VERIFY — success redirect & webhook both enqueue a BullMQ job.
 *    The HTTP handler returns instantly (<5ms). The worker does the outbound
 *    PayU verify API call (100-500ms) off the hot path.
 *
 * 2. SYNC FALLBACK — if Redis/BullMQ is unavailable, falls back to inline
 *    verify (for local dev / Redis-down scenarios).
 *
 * 3. IDEMPOTENCY — BullMQ deduplicates by jobId=`payu:{txnid}`.
 *    Additional Redis key `redirect:processed:{txnid}` guards the redirect handler.
 *    DB transaction with `certificate.findUnique` guard prevents double certificates.
 *
 * 4. RACE GUARD — PAID order cannot be overwritten by a late FAILED webhook.
 */

const { db } = require('../../config/database');
const { redisGet, redisSet } = require('../../config/redis');
const {
  buildPayUParams,
  getPayUPaymentUrl,
  verifyPayUHash,
  verifyWebhookHash,
  verifyPaymentWithPayU,
  generateTxnId,
} = require('../../utils/payu');
const { generateVerificationHash } = require('../../utils/hash');
const { sendPaymentConfirmationEmail } = require('../../utils/email');
const { enqueuePaymentVerification } = require('../../config/queue');
const env = require('../../config/env');

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */

async function generateCertificateSerial(batchId) {
  const batch = await db.batch.update({
    where: { id: batchId },
    data: { id_counter: { increment: 1 } },
    select: { id_prefix: true, id_counter: true },
  });
  return `${batch.id_prefix}-${String(batch.id_counter).padStart(4, '0')}`;
}

/* ─────────────────────────────────────────────
   Core settling (called by worker AND sync fallback)
   Exported so the worker can call them directly.
───────────────────────────────────────────── */

async function markOrderPaid(orderId, txnid, mihpayid, gatewayResponse, isWebhook = false) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      batch: { include: { company: { select: { id: true, name: true } } } },
    },
  });

  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  if (order.status === 'PAID') {
    console.log(`[Payment] Order ${orderId} already PAID — idempotent skip`);
    return { status: 'already_paid', orderId };
  }

  await db.$transaction(async (tx) => {
    await tx.payment.updateMany({
      where: { order_id: orderId },
      data: {
        status: 'SUCCESS',
        payu_txn_id: txnid,
        payu_payment_id: mihpayid || null,
        gateway_response: gatewayResponse || {},
        ...(isWebhook ? { webhook_payload: gatewayResponse } : {}),
      },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'PAID', payu_txn_id: txnid },
    });

    const existing = await tx.certificate.findUnique({ where: { order_id: orderId } });
    if (!existing) {
      const verificationHash = generateVerificationHash(
        order.certificate_serial,
        order.user_id,
        order.batch_id
      );
      const template = await tx.certificateTemplate.findFirst({
        where: { batch_id: order.batch_id, is_active: true },
        orderBy: { created_at: 'desc' },
      });
      await tx.certificate.create({
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

    // Create invoice record (idempotent — skip if already exists)
    const existingInvoice = await tx.invoice.findUnique({ where: { order_id: orderId } });
    if (!existingInvoice) {
      await tx.invoice.create({
        data: {
          order_id: orderId,
          invoice_number: `INV-${order.certificate_serial}`,
          amount: order.amount,
          currency: order.currency,
          payu_txn_id: txnid || null,
          paid_at: new Date(),
        },
      });
    }
  });

  // Fire-and-forget email — never await in the hot path
  sendPaymentConfirmationEmail({
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
  }).catch((e) => console.error('[Payment] Email failed (non-fatal):', e.message));

  return { status: 'paid', orderId };
}

async function markOrderFailed(orderId, txnid, mihpayid, gatewayResponse, isWebhook = false) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  if (order.status === 'PAID') {
    console.warn(`[Payment] FAILED received for PAID order ${orderId} — ignoring`);
    return { status: 'already_paid', orderId };
  }

  await db.payment.updateMany({
    where: { order_id: orderId },
    data: {
      status: 'FAILURE',
      payu_txn_id: txnid || order.payu_txn_id,
      payu_payment_id: mihpayid || null,
      gateway_response: gatewayResponse || {},
      ...(isWebhook ? { webhook_payload: gatewayResponse } : {}),
    },
  });

  await db.order.update({
    where: { id: orderId },
    data: { status: 'FAILED' },
  });

  return { status: 'failed', orderId };
}

/* ─────────────────────────────────────────────
   Inline (synchronous) verify — used as fallback
   when Redis/BullMQ is unavailable
───────────────────────────────────────────── */

async function syncVerifyAndSettle(orderId, txnid, mihpayid, payload, isWebhook) {
  let payuResult;
  try {
    payuResult = await verifyPaymentWithPayU(txnid);
  } catch (verifyErr) {
    console.error(`[Payment] Sync PayU verify failed: ${verifyErr.message}`);
    // Last resort: trust the hash-verified redirect/webhook
    return markOrderPaid(orderId, txnid, mihpayid, payload, isWebhook);
  }

  if (payuResult.verified) {
    return markOrderPaid(orderId, txnid, payuResult.mihpayid || mihpayid, payload, isWebhook);
  }
  if (payuResult.status === 'pending') {
    return { status: 'pending', orderId };
  }
  return markOrderFailed(orderId, txnid, mihpayid, payload, isWebhook);
}

/* ─────────────────────────────────────────────
   Initiate Payment
───────────────────────────────────────────── */

async function initiatePayment(userId, data) {
  const { batch_id } = data;

  const [user, batch] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, phone: true },
    }),
    db.batch.findUnique({
      where: { id: batch_id },
      include: {
        company: { select: { id: true, name: true } },
        program: { select: { type: true, name: true } },
      },
    }),
  ]);

  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (!batch) throw Object.assign(new Error('Batch not found'), { statusCode: 404 });

  if (!batch.is_active || batch.status === 'COMPLETED' || batch.status === 'HOLD') {
    const msg = batch.status === 'HOLD'
      ? 'Payments for this batch are temporarily paused'
      : 'This batch is not accepting payments';
    throw Object.assign(new Error(msg), { statusCode: 400 });
  }

  const existingPaid = await db.order.findFirst({
    where: { user_id: userId, batch_id, status: 'PAID' },
  });
  if (existingPaid) {
    throw Object.assign(new Error('You already have a certificate for this batch'), { statusCode: 409 });
  }

  // Reuse PENDING order (idempotent initiation — supports page refresh)
  let order = await db.order.findFirst({
    where: { user_id: userId, batch_id, status: 'PENDING' },
  });

  if (!order) {
    const certificateSerial = await generateCertificateSerial(batch_id);
    order = await db.order.create({
      data: {
        user_id: userId,
        batch_id,
        company_id: batch.company.id,
        certificate_serial: certificateSerial,
        amount: batch.certificate_price,
        currency: batch.currency || 'INR',
        status: 'PENDING',
        payu_order_id: require('crypto').randomUUID(),
      },
    });
  }

  // Deterministic txnid — same order always produces same txnid (18 chars)
  const txnid = generateTxnId(order.id);

  await db.order.update({ where: { id: order.id }, data: { payu_txn_id: txnid } });

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
    udf1: order.id,
    udf2: userId,
    udf3: batch_id,
    udf4: batch.company.id,
    udf5: '',
  });

  // Create payment record (idempotent — only if not already created)
  const existingPayment = await db.payment.findFirst({ where: { order_id: order.id } });
  if (!existingPayment) {
    await db.payment.create({
      data: {
        order_id: order.id,
        payu_txn_id: txnid,
        amount: batch.certificate_price,
        currency: batch.currency || 'INR',
        status: 'INITIATED',
        gateway_response: { initiated_at: new Date().toISOString() },
      },
    });
  }

  return {
    paymentUrl: getPayUPaymentUrl(),
    payuParams,
    orderId: order.id,
    txnid,
    amount: batch.certificate_price,
  };
}

/* ─────────────────────────────────────────────
   Success Redirect Handler
   Returns in <5ms — all heavy work goes to queue
───────────────────────────────────────────── */

async function handlePaymentSuccess(responseData) {
  const { txnid, mihpayid } = responseData;

  // 1. Verify redirect hash — prevents tampered redirects
  if (!verifyPayUHash(responseData)) {
    throw Object.assign(
      new Error('Payment redirect signature invalid'),
      { statusCode: 400, code: 'HASH_MISMATCH' }
    );
  }

  const orderId = responseData.udf1;
  if (!orderId) {
    throw Object.assign(new Error('Order ID missing from payment response'), { statusCode: 400 });
  }

  // 2. Idempotency guard — redirect fires once per txn
  const idempotencyKey = `redirect:processed:${txnid}`;
  const alreadyProcessed = await redisGet(idempotencyKey);
  if (alreadyProcessed) {
    console.log(`[Payment] Redirect duplicate for ${txnid} — already queued/processed`);
    return { status: 'processing', orderId };
  }
  await redisSet(idempotencyKey, '1', 86_400);

  // 3. Enqueue async verification job (the fast path — returns in <1ms)
  const job = await enqueuePaymentVerification({
    txnid,
    orderId,
    source: 'redirect',
    redirectBody: responseData,
  });

  if (job) {
    // Queue accepted the job — return immediately, worker will settle it
    console.log(`[Payment] Verification job ${job.id} queued for txn ${txnid}`);
    return { status: 'processing', orderId };
  }

  // Fallback: Redis unavailable — verify synchronously
  console.warn(`[Payment] Queue unavailable — synchronous verify for txn ${txnid}`);
  return syncVerifyAndSettle(orderId, txnid, mihpayid, responseData, false);
}

/* ─────────────────────────────────────────────
   Failure Redirect Handler
───────────────────────────────────────────── */

async function handlePaymentFailure(responseData) {
  const { txnid, mihpayid } = responseData;
  const orderId = responseData.udf1;

  if (!orderId) {
    throw Object.assign(new Error('Order ID missing from failure response'), { statusCode: 400 });
  }

  return markOrderFailed(orderId, txnid, mihpayid, responseData, false);
}

/* ─────────────────────────────────────────────
   Webhook / IPN Handler
   Returns in <5ms — verification goes to queue
───────────────────────────────────────────── */

async function handleWebhook(webhookData) {
  const { txnid, mihpayid } = webhookData;

  if (!txnid) {
    throw Object.assign(new Error('txnid missing from webhook'), { statusCode: 400 });
  }

  // 1. Verify webhook signature (Salt2 first, Salt1 fallback)
  if (!verifyWebhookHash(webhookData)) {
    throw Object.assign(
      new Error('Webhook signature invalid'),
      { statusCode: 400, code: 'HASH_MISMATCH' }
    );
  }

  const orderId = webhookData.udf1;
  if (!orderId) {
    throw Object.assign(new Error('Order ID missing from webhook'), { statusCode: 400 });
  }

  // 2. Enqueue verification — BullMQ jobId deduplication handles
  //    the case where redirect already queued the same txn
  const job = await enqueuePaymentVerification({
    txnid,
    orderId,
    source: 'webhook',
    webhookBody: webhookData,
  });

  if (job) {
    console.log(`[Payment] Webhook verification job ${job.id} queued for txn ${txnid}`);
    return { status: 'queued', orderId };
  }

  // Fallback: synchronous verify
  console.warn(`[Payment] Queue unavailable — synchronous webhook verify for txn ${txnid}`);
  return syncVerifyAndSettle(orderId, txnid, mihpayid, webhookData, true);
}

/* ─────────────────────────────────────────────
   Admin Reconciliation
───────────────────────────────────────────── */

async function reconcilePayment(txnid) {
  const order = await db.order.findFirst({
    where: { payu_txn_id: txnid },
  });

  if (!order) {
    throw Object.assign(
      new Error(`No order found for txnid: ${txnid}`),
      { statusCode: 404 }
    );
  }

  const payuResult = await verifyPaymentWithPayU(txnid);

  let result;
  if (payuResult.verified) {
    result = await markOrderPaid(order.id, txnid, payuResult.mihpayid, payuResult.txnDetails, false);
  } else if (payuResult.status === 'pending') {
    result = { status: 'pending', orderId: order.id, message: 'Transaction still pending at PayU' };
  } else {
    result = await markOrderFailed(order.id, txnid, payuResult.mihpayid, payuResult.txnDetails, false);
  }

  return {
    ...result,
    payuStatus: payuResult.status,
    payuVerified: payuResult.verified,
    payuAmount: payuResult.amount,
    mihpayid: payuResult.mihpayid,
  };
}

/* ─────────────────────────────────────────────
   Payment Status (user-facing)
───────────────────────────────────────────── */

async function getPaymentStatus(userId, orderId) {
  const order = await db.order.findFirst({
    where: { id: orderId, user_id: userId },
    include: {
      payments: {
        orderBy: { created_at: 'desc' },
        take: 1,
        select: {
          status: true,
          payu_payment_id: true,
          payu_txn_id: true,
          amount: true,
          created_at: true,
        },
      },
      certificate: {
        select: {
          id: true,
          is_issued: true,
          certificate_serial: true,
          verification_hash: true,
        },
      },
      batch: {
        select: {
          id: true,
          name: true,
          company: { select: { name: true } },
        },
      },
    },
  });

  if (!order) {
    throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  }

  return order;
}

/* ─────────────────────────────────────────────
   Invoice Record helpers
   Used by download endpoints to get consistent invoice_number
   and track download counts.
───────────────────────────────────────────── */

async function getOrCreateInvoiceRecord(orderId) {
  let invoice = await db.invoice.findUnique({ where: { order_id: orderId } });
  if (!invoice) {
    // Fallback for orders paid before invoice tracking was added
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { certificate_serial: true, amount: true, currency: true, payu_txn_id: true, status: true },
    });
    if (!order) throw Object.assign(new Error('Order not found'), { statusCode: 404 });

    const invoiceNumber = `INV-${order.certificate_serial}`;
    invoice = await db.invoice.upsert({
      where: { order_id: orderId },
      create: {
        order_id: orderId,
        invoice_number: invoiceNumber,
        amount: order.amount,
        currency: order.currency,
        payu_txn_id: order.payu_txn_id || null,
        paid_at: order.status === 'PAID' ? new Date() : null,
      },
      update: {},
    });
  }
  return invoice;
}

async function incrementInvoiceDownloadCount(orderId) {
  await db.invoice.updateMany({
    where: { order_id: orderId },
    data: { download_count: { increment: 1 } },
  });
}

module.exports = {
  initiatePayment,
  handlePaymentSuccess,
  handlePaymentFailure,
  handleWebhook,
  reconcilePayment,
  getPaymentStatus,
  getOrCreateInvoiceRecord,
  incrementInvoiceDownloadCount,
  // Exported for worker reuse
  markOrderPaid,
  markOrderFailed,
};
