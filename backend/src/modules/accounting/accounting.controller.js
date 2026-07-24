'use strict';

const accountingService = require('./accounting.service');
const { sendError } = require('../../utils/apiResponse');

async function downloadTransactionReceipt(req, res) {
  try {
    const { transaction, pdfBuffer } = await accountingService.getTransactionReceipt(req.params.payuId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${transaction.payu_id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    return sendError(res, err.message, err.statusCode || 500);
  }
}

module.exports = {
  downloadTransactionReceipt,
};
