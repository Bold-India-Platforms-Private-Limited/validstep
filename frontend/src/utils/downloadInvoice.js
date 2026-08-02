import { store } from '../store'

async function fetchAuthedBlob(url, errorMessage) {
  const token = store.getState().auth.accessToken
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: token ? `Bearer ${token}` : '' },
    credentials: 'include',
  })

  if (!res.ok) {
    let message = errorMessage
    try {
      const json = await res.json()
      message = json?.message || message
    } catch { /* ignore */ }
    throw new Error(message)
  }

  return res.blob()
}

async function fetchInvoiceBlob(role, orderId) {
  const baseUrl = import.meta.env.VITE_API_URL || '/api'
  return fetchAuthedBlob(`${baseUrl}/${role}/orders/${orderId}/invoice`, 'Failed to load invoice')
}

function saveBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}

/**
 * Download an issued certificate file by hitting the authenticated backend endpoint, which
 * proxies R2-hosted admin-uploaded files (or serves locally-generated PDFs directly) with a
 * Content-Disposition header — a plain <a href> to the R2 URL would just open it in-browser.
 *
 * @param {string} certificateId - Certificate UUID
 * @param {string} filename - Download filename (e.g. "certificate-CERT-0001.jpg")
 */
export async function downloadCertificateFile(certificateId, filename = 'certificate') {
  const baseUrl = import.meta.env.VITE_API_URL || '/api'
  const blob = await fetchAuthedBlob(`${baseUrl}/user/certificates/${certificateId}/download`, 'Failed to load certificate')
  saveBlob(blob, filename)
}

/**
 * Download an invoice PDF by hitting the authenticated backend endpoint.
 * Uses raw fetch (not RTK Query) because the response is a binary PDF blob.
 *
 * @param {'user'|'company'|'admin'} role - API path prefix
 * @param {string} orderId - Order UUID
 * @param {string} filename - Download filename (e.g. "invoice-CERT-0001.pdf")
 */
export async function downloadInvoicePDF(role, orderId, filename = 'invoice.pdf') {
  const blob = await fetchInvoiceBlob(role, orderId)
  saveBlob(blob, filename)
}

/**
 * Fetch an invoice PDF and return a blob object URL for inline preview (e.g. an <iframe>),
 * instead of triggering a file download. Caller is responsible for calling
 * URL.revokeObjectURL on the returned URL once done with it.
 */
export async function getInvoicePreviewUrl(role, orderId) {
  const blob = await fetchInvoiceBlob(role, orderId)
  return URL.createObjectURL(blob)
}
