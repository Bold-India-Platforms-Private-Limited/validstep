'use strict';

const crypto = require('crypto');
const env = require('../config/env');

/**
 * Generate PayU hash for payment request
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
 * Verify PayU response hash
 * Formula: SHA512(salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
 */
function verifyPayUHash(responseParams) {
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

  const hashString = [
    env.PAYU_SALT,
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
 * Build the PayU payment form parameters
 */
function buildPayUParams(orderData) {
  const {
    txnid,
    amount,
    productinfo,
    firstname,
    email,
    phone,
    surl,   // success URL
    furl,   // failure URL
    udf1 = '', // orderId
    udf2 = '', // userId
    udf3 = '', // batchId
    udf4 = '',
    udf5 = '',
  } = orderData;

  const hash = generatePayUHash({
    txnid,
    amount: String(parseFloat(amount).toFixed(2)),
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
    amount: String(parseFloat(amount).toFixed(2)),
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
  };
}

/**
 * Get the PayU payment endpoint URL
 */
function getPayUPaymentUrl() {
  return `${env.PAYU_BASE_URL}/_payment`;
}

module.exports = {
  generatePayUHash,
  verifyPayUHash,
  buildPayUParams,
  getPayUPaymentUrl,
};
