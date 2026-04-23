import { store } from '../store'

/**
 * Download an invoice PDF by hitting the authenticated backend endpoint.
 * Uses raw fetch (not RTK Query) because the response is a binary PDF blob.
 *
 * @param {'user'|'company'|'admin'} role - API path prefix
 * @param {string} orderId - Order UUID
 * @param {string} filename - Download filename (e.g. "invoice-CERT-0001.pdf")
 */
export async function downloadInvoicePDF(role, orderId, filename = 'invoice.pdf') {
  const token = store.getState().auth.accessToken
  const baseUrl = import.meta.env.VITE_API_URL || '/api'
  const url = `${baseUrl}/${role}/orders/${orderId}/invoice`

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: token ? `Bearer ${token}` : '' },
    credentials: 'include',
  })

  if (!res.ok) {
    let message = 'Failed to download invoice'
    try {
      const json = await res.json()
      message = json?.message || message
    } catch { /* ignore */ }
    throw new Error(message)
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
