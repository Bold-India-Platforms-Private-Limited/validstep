'use strict';

const { db } = require('../../config/database');
const { generateReceiptPDF } = require('../../utils/paymentReceiptGenerator');

function toNumber(decimal) {
  return decimal === null || decimal === undefined ? 0 : Number(decimal);
}

/**
 * Fee/net breakdown for a single PayU transaction — combines its exact per-transaction
 * processing/priority-settlement fee (from the settlement ledger) with its proportional
 * share of that day's ~2% PayU platform fee (allocated, since PayU settles that once per
 * day, not per row).
 */
async function computeTransactionFeeBreakdown(transaction) {
  const payuId = transaction.payu_id;
  const settlement = await db.payuSettlement.findFirst({
    where: { payu_id: payuId, requested_action: 'capture' },
  });

  const amount = toNumber(transaction.amount);
  const perTransactionFee = Math.abs(toNumber(settlement?.total_processing_fees));
  const perTransactionGst = Math.abs(toNumber(settlement?.total_service_tax));
  const prioritySettlementFee = Math.abs(toNumber(settlement?.priority_settlement_fee));
  const prioritySettlementGst = Math.abs(toNumber(settlement?.priority_settlement_tax));
  const ledgerSettledAmount = toNumber(settlement?.amount_net_signed) || (amount - perTransactionFee - perTransactionGst - prioritySettlementFee - prioritySettlementGst);

  let platformFeeShare = 0;
  let platformFeeGstShare = 0;
  let hasPlatformFeeAllocation = false;

  if (settlement?.settlement_date) {
    const [dayCaptures, dayAdjustments] = await Promise.all([
      db.payuSettlement.aggregate({
        where: { settlement_date: settlement.settlement_date, requested_action: 'capture' },
        _sum: { amount: true },
      }),
      db.payuSettlement.aggregate({
        where: { settlement_date: settlement.settlement_date, requested_action: 'Adjustment_debit' },
        _sum: { total_processing_fees: true, total_service_tax: true },
      }),
    ]);
    const dayCaptureTotal = toNumber(dayCaptures._sum.amount);
    const dayPlatformFee = Math.abs(toNumber(dayAdjustments._sum.total_processing_fees));
    const dayPlatformFeeGst = Math.abs(toNumber(dayAdjustments._sum.total_service_tax));
    if (dayCaptureTotal > 0 && (dayPlatformFee > 0 || dayPlatformFeeGst > 0)) {
      const share = amount / dayCaptureTotal;
      platformFeeShare = dayPlatformFee * share;
      platformFeeGstShare = dayPlatformFeeGst * share;
      hasPlatformFeeAllocation = true;
    }
  }

  const totalFee = perTransactionFee + perTransactionGst + prioritySettlementFee + prioritySettlementGst + platformFeeShare + platformFeeGstShare;
  const netAmount = amount - totalFee;

  return {
    amount, perTransactionFee, perTransactionGst, prioritySettlementFee, prioritySettlementGst,
    ledgerSettledAmount, platformFeeShare, platformFeeGstShare, hasPlatformFeeAllocation,
    totalFee, netAmount,
  };
}

/**
 * Fee/net breakdown for a page of PayU Button "invoice" rows (see admin.service.js
 * getAllInvoices) — keyed by payu_id so the caller can attach it to each row without an N+1
 * lookup pattern in the route handler itself.
 */
async function getTransactionFeesForPayuIds(payuIds) {
  if (!payuIds.length) return new Map();
  const transactions = await db.payuTransaction.findMany({ where: { payu_id: { in: payuIds } } });
  const entries = await Promise.all(
    transactions.map(async (t) => [t.payu_id, await computeTransactionFeeBreakdown(t)])
  );
  return new Map(entries);
}

async function getTransactionReceipt(payuId) {
  const transaction = await db.payuTransaction.findUnique({ where: { payu_id: payuId } });
  if (!transaction) throw Object.assign(new Error('Transaction not found'), { statusCode: 404 });

  const fee = await computeTransactionFeeBreakdown(transaction);

  const pdfBuffer = await generateReceiptPDF({
    receiptNumber: `PU-${payuId}`,
    payuId,
    txnid: transaction.txnid,
    customerName: [transaction.firstname, transaction.lastname].filter(Boolean).join(' '),
    customerEmail: transaction.email,
    productInfo: transaction.productinfo,
    mode: transaction.mode,
    addedOn: transaction.addedon,
    amount: fee.amount,
    perTransactionFee: fee.perTransactionFee,
    perTransactionGst: fee.perTransactionGst,
    prioritySettlementFee: fee.prioritySettlementFee,
    prioritySettlementGst: fee.prioritySettlementGst,
    ledgerSettledAmount: fee.ledgerSettledAmount,
    platformFeeShare: fee.platformFeeShare,
    platformFeeGstShare: fee.platformFeeGstShare,
    estimatedNetAmount: fee.netAmount,
    hasPlatformFeeAllocation: fee.hasPlatformFeeAllocation,
  });

  return { transaction, pdfBuffer };
}

module.exports = {
  getTransactionReceipt,
  getTransactionFeesForPayuIds,
};
