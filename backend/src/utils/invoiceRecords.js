'use strict';

const { db } = require('../config/database');

/**
 * Get (or lazily create, for orders paid before invoice tracking existed) the Invoice
 * record for an order. Used by every invoice-download endpoint (admin/company/user) to
 * get a consistent invoice_number and track download counts — independent of how the
 * order was paid (live checkout, manual enrollment, or imported PayU transaction).
 */
async function getOrCreateInvoiceRecord(orderId) {
  let invoice = await db.invoice.findUnique({ where: { order_id: orderId } });
  if (!invoice) {
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

module.exports = { getOrCreateInvoiceRecord, incrementInvoiceDownloadCount };
