'use strict';

const crypto = require('crypto');
const env = require('../config/env');

/**
 * PayU server-side verification API
 * https://info.payu.in/merchant/postservice.php?form=2
 */
const PAYU_VERIFY_URL = 'https://info.payu.in/merchant/postservice.php?form=2';

/**
 * Generate a deterministic transaction ID from an order UUID.
 * Format: VS + first 16 hex chars of orderId (no hyphens) — max 18 chars.
 * Deterministic so retried initiations reuse same txnid.
 */
function generateTxnId(orderId) {
  const hex = orderId.replace(/-/g, '').slice(0, 16).toUpperCase();
  return `VS${hex}`;
}

/**
 * Generate PayU hash for payment initiation.
 * Formula: SHA512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt)
 */
function generatePayUHash(params) {
  const {
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1 = '',
    udf2 = '',
    udf3 = '',
    udf4 = '',
    udf5 = '',
  } = params;

  const hashString = [
    env.PAYU_KEY,
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    '', // udf6
    '', // udf7
    '', // udf8
    '', // udf9
    '', // udf10
    env.PAYU_SALT,
  ].join('|');

  return crypto.createHash('sha512').update(hashString).digest('hex');
}

/**
 * Verify PayU response hash from redirect (success/failure POST).
 * Formula: SHA512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 *
 * @param {object} responseParams - POST body from PayU redirect
 * @param {boolean} useSalt2 - use Salt2 instead of Salt1 (for webhook IPN)
 */
function verifyPayUHash(responseParams, useSalt2 = false) {
  const {
    status,
    udf5 = '',
    udf4 = '',
    udf3 = '',
    udf2 = '',
    udf1 = '',
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    hash: receivedHash,
  } = responseParams;

  const salt = useSalt2 && env.PAYU_SALT2 ? env.PAYU_SALT2 : env.PAYU_SALT;

  const hashString = [
    salt,
    status,
    '', // udf10
    '', // udf9
    '', // udf8
    '', // udf7
    '', // udf6
    udf5,
    udf4,
    udf3,
    udf2,
    udf1,
    email,
    firstname,
    productinfo,
    amount,
    txnid,
    env.PAYU_KEY,
  ].join('|');

  const computedHash = crypto.createHash('sha512').update(hashString).digest('hex');
  return computedHash === receivedHash;
}

/**
 * Verify webhook signature — tries Salt2 first (2024+ IPN standard), falls back to Salt1.
 * PayU recommends Salt2 for webhook/IPN verification.
 */
function verifyWebhookHash(webhookData) {
  // Try Salt2 first if configured in dashboard
  if (env.PAYU_SALT2) {
    if (verifyPayUHash(webhookData, true)) return true;
  }
  // Fall back to Salt1
  return verifyPayUHash(webhookData, false);
}

/**
 * Generate hash for PayU server-side API calls.
 * Formula: SHA512(key|command|var1|salt)
 */
function generateApiHash(command, var1) {
  const hashString = `${env.PAYU_KEY}|${command}|${var1}|${env.PAYU_SALT}`;
  return crypto.createHash('sha512').update(hashString).digest('hex');
}

/**
 * Server-to-server transaction verification with PayU.
 * CRITICAL: Always call this before marking any order as PAID.
 * Uses PayU's verify_payment API to confirm the transaction truly succeeded.
 *
 * @param {string} txnid - the transaction ID used during initiation
 * @returns {{ verified: boolean, status: string, mihpayid: string, amount: string, txnDetails: object }}
 */
async function verifyPaymentWithPayU(txnid) {
  const command = 'verify_payment';
  const hash = generateApiHash(command, txnid);

  const bodyParams = new URLSearchParams({
    key: env.PAYU_KEY,
    command,
    var1: txnid,
    hash,
  });

  let response;
  try {
    response = await fetch(PAYU_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams.toString(),
      signal: AbortSignal.timeout(20_000), // 20s timeout
    });
  } catch (networkErr) {
    // Network failure — do NOT silently pass. Caller decides how to handle.
    throw Object.assign(
      new Error(`PayU verify API unreachable: ${networkErr.message}`),
      { code: 'PAYU_NETWORK_ERROR' }
    );
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(`PayU verify API returned HTTP ${response.status}`),
      { code: 'PAYU_API_ERROR' }
    );
  }

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw Object.assign(
      new Error(`PayU verify API returned non-JSON: ${text.slice(0, 300)}`),
      { code: 'PAYU_PARSE_ERROR' }
    );
  }

  // transaction_details is keyed by txnid
  const txnDetails = data?.transaction_details?.[txnid];

  if (!txnDetails) {
    return {
      verified: false,
      status: 'not_found',
      mihpayid: null,
      amount: null,
      txnDetails: null,
      raw: data,
    };
  }

  const payuStatus = String(txnDetails.status || '').toLowerCase();
  const mihpayid = txnDetails.mihpayid;

  // A transaction is genuinely successful only when:
  // 1. status === 'success' from PayU verify API
  // 2. mihpayid is non-null and not '0' (PayU's sentinel for unprocessed)
  const verified =
    payuStatus === 'success' &&
    mihpayid != null &&
    String(mihpayid) !== '0';

  return {
    verified,
    status: payuStatus,   // 'success' | 'failure' | 'pending' | 'not_found'
    mihpayid: String(mihpayid || ''),
    amount: txnDetails.amount,
    txnDetails,
    raw: data,
  };
}

/**
 * Build the PayU payment form parameters for frontend POST.
 */
function buildPayUParams(orderData) {
  const {
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    phone,
    surl,
    furl,
    udf1 = '', // orderId
    udf2 = '', // userId
    udf3 = '', // batchId
    udf4 = '', // companyId
    udf5 = '',
  } = orderData;

  const normalizedAmount = String(parseFloat(amount).toFixed(2));

  const hash = generatePayUHash({
    txnid,
    amount: normalizedAmount,
    productinfo,
    firstname,
    email,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
  });

  return {
    key: env.PAYU_KEY,
    txnid,
    amount: normalizedAmount,
    productinfo,
    firstname,
    email,
    phone: phone || '',
    surl,
    furl,
    hash,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    service_provider: 'payu_paisa', // required field
  };
}

/**
 * Get the PayU payment endpoint URL based on environment.
 */
function getPayUPaymentUrl() {
  return `${env.PAYU_BASE_URL}/_payment`;
}

module.exports = {
  generateTxnId,
  generatePayUHash,
  verifyPayUHash,
  verifyWebhookHash,
  verifyPaymentWithPayU,
  buildPayUParams,
  getPayUPaymentUrl,
};
