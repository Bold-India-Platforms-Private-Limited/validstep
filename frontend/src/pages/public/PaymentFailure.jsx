import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import {
  XCircle,
  RefreshCw,
  Home,
  Mail,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react'
import { PublicLayout } from '../../components/layouts/PublicLayout'

const COMPANY = {
  name: 'Bold India Platforms Private Limited',
  email: 'hello@boldindia.in',
  website: 'www.boldindia.in',
  cin: 'U85499PN2025PTC246360',
  address: 'Sn 242/1/2 Baner, Tejaswini Soc, DP Road, N.I.A., Pune, Maharashtra 411045',
}

// Common PayU failure reason codes → human-readable messages
const FAILURE_REASONS = {
  User_Cancelled: 'You cancelled the payment.',
  Failure: 'Payment was declined by your bank.',
  dropped: 'Transaction was dropped — your card was not charged.',
  pending: 'Transaction is still pending. Check your dashboard in a few minutes.',
}

export default function PaymentFailure() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const orderId = searchParams.get('order_id')
  const txnid = searchParams.get('txnid')
  const errorMsg = searchParams.get('error')
  const status = searchParams.get('status')

  const friendlyReason =
    FAILURE_REASONS[status] ||
    FAILURE_REASONS[errorMsg] ||
    'Your payment could not be completed.'

  const safeError = errorMsg && !errorMsg.toLowerCase().includes('hash')
    ? errorMsg
    : null

  return (
    <PublicLayout showBackToHome mainClassName="bg-gradient-to-br from-red-50 via-white to-slate-50">
      <div className="w-full max-w-lg mx-auto px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-white shadow-xl overflow-hidden">
          {/* Red header */}
          <div className="bg-gradient-to-r from-red-500 to-rose-500 px-8 py-8 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40">
              <XCircle className="h-9 w-9 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Payment Failed</h2>
            <p className="mt-1 text-red-100 text-sm">No amount has been deducted</p>
          </div>

          <div className="px-8 py-6 space-y-4">
            {/* Reason */}
            <div className="rounded-xl bg-red-50 border border-red-100 p-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{safeError || friendlyReason}</p>
              </div>
            </div>

            {/* Refs */}
            {(txnid || orderId) && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm">
                {txnid && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transaction Ref</span>
                    <span className="font-mono text-xs text-slate-700">{txnid}</span>
                  </div>
                )}
                {orderId && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order ID</span>
                    <span className="font-mono text-xs text-slate-700">{orderId.slice(0, 8)}…</span>
                  </div>
                )}
              </div>
            )}

            {/* What to do */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">What to do next</p>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li>Check that your card / UPI details are correct</li>
                <li>Ensure sufficient funds in your account</li>
                <li>Try a different payment method</li>
                <li>If you were charged, contact us immediately</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-1">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> Retry from Dashboard
              </button>
              <a
                href={`mailto:${COMPANY.email}?subject=Payment%20Failed%20-%20${txnid || 'Unknown'}${orderId ? `%20Order%20${orderId}` : ''}`}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Mail className="h-4 w-4" /> Email Support
              </a>
              <button
                onClick={() => navigate('/')}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Home className="h-4 w-4" /> Go to Homepage
              </button>
            </div>
          </div>
        </div>

        {/* Company footer */}
        <div className="mt-8 text-center text-xs text-slate-400 space-y-1">
          <p className="font-medium text-slate-500">{COMPANY.name}</p>
          <p>CIN: {COMPANY.cin}</p>
          <p>{COMPANY.address}</p>
          <p>
            <a href={`mailto:${COMPANY.email}`} className="hover:text-emerald-600 transition-colors">
              {COMPANY.email}
            </a>
            {' · '}
            <a href={`https://${COMPANY.website}`} target="_blank" rel="noreferrer" className="hover:text-emerald-600 transition-colors">
              {COMPANY.website}
            </a>
          </p>
        </div>
      </div>
    </PublicLayout>
  )
}
