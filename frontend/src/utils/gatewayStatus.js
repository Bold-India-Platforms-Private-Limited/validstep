// Real transaction statuses across both gateways aren't uniformly cased (PayU: "Refunded",
// "Chargebacked"; Razorpay: "refunded", lowercase). Checked case-sensitively first, then
// case-insensitively, so a status the map doesn't recognize yet still degrades to "default"
// instead of throwing.
const VARIANT_BY_STATUS = {
  captured: 'success',
  success: 'success',
  refunded: 'info',
  chargebacked: 'danger',
  chargeback: 'danger',
  failed: 'danger',
  bounced: 'danger',
  usercancelled: 'danger',
  dropped: 'danger',
  pending: 'warning',
}

export function gatewayStatusVariant(status) {
  if (!status) return 'default'
  return VARIANT_BY_STATUS[status] || VARIANT_BY_STATUS[status.toLowerCase()] || 'default'
}
