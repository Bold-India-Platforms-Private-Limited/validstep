'use strict';

const { db } = require('../config/database');

/**
 * Proof-of-delivery audit trail write. Fire-and-forget by design — a logging failure must
 * never break the actual download/action it's recording (PAYMENT_IMPORTED | USER_CREATED |
 * BATCH_ASSIGNED | CERTIFICATE_GENERATED | CERTIFICATE_DOWNLOADED | INVOICE_DOWNLOADED).
 */
async function logDeliveryEvent(userId, event, orderId = null, metadata = null) {
  try {
    await db.deliveryEvent.create({ data: { user_id: userId, order_id: orderId, event, metadata } });
  } catch (err) {
    console.error('[DeliveryEvent] Failed to log:', err.message);
  }
}

module.exports = { logDeliveryEvent };
