import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  CheckCircle2,
  Loader2,
  Award,
  Clock,
  ArrowRight,
  Download,
  Mail,
  AlertTriangle,
} from 'lucide-react'
import axiosClient from '../../api/axiosClient'
import { PublicLayout } from '../../components/layouts/PublicLayout'

const COMPANY = {
  name: 'Bold India Platforms Private Limited',
  email: 'hello@boldindia.in',
  website: 'www.boldindia.in',
  cin: 'U85499PN2025PTC246360',
  address: 'Sn 242/1/2 Baner, Tejaswini Soc, DP Road, N.I.A., Pune, Maharashtra 411045',
}

const POLL_INTERVAL_MS = 2500   // poll every 2.5s
const POLL_MAX_ATTEMPTS = 20    // give up after 50s (worker should settle by then)

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [order, setOrder] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | paid | pending | error
  const [pollCount, setPollCount] = useState(0)

  const orderId = searchParams.get('order_id')
  const txnid = searchParams.get('txnid')
  const urlStatus = searchParams.get('status')

  useEffect(() => {
    if (!orderId) { setPhase('error'); return }

    let timer = null
    let attempts = 0

    /**
     * Poll /payment/status/:orderId until the order is PAID or FAILED.
     * The backend now returns quickly (status=processing) while a BullMQ worker
     * verifies with PayU in the background. This polling resolves that async gap.
     */
    const poll = async () => {
      try {
        const res = await axiosClient.get(`/payment/status/${orderId}`)
        const orderData = res.data?.data || res.data
        setOrder(orderData)
        attempts++
        setPollCount(attempts)

        if (orderData.status === 'PAID') {
          setPhase('paid')
          return // stop polling
        }

        if (orderData.status === 'FAILED') {
          // Redirect to failure page so the user sees the proper failure UI
          navigate(`/payment/failure?order_id=${orderId}&status=failed`)
          return
        }

        // PENDING = worker is still processing — keep polling
        if (attempts < POLL_MAX_ATTEMPTS) {
          timer = setTimeout(poll, POLL_INTERVAL_MS)
        } else {
          // Timed out — show pending state (webhook will eventually settle it)
          setPhase('pending')
        }
      } catch {
        if (urlStatus === 'paid' || urlStatus === 'already_paid') {
          setPhase('paid')
        } else if (urlStatus === 'pending' || urlStatus === 'processing') {
          setPhase('pending')
        } else {
          setPhase('error')
        }
      }
    }

    poll()
    return () => { if (timer) clearTimeout(timer) }
  }, [orderId, urlStatus])

  // Auto-redirect to dashboard after success
  useEffect(() => {
    if (phase === 'paid') {
      const timer = setTimeout(() => navigate('/dashboard'), 6000)
      return () => clearTimeout(timer)
    }
  }, [phase, navigate])

  return (
    <PublicLayout showBackToHome mainClassName="bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="w-full max-w-lg mx-auto px-4 py-12">
        {/* ── Loading / Polling ── */}
        {phase === 'loading' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-lg">
            <Loader2 className="mx-auto mb-5 h-14 w-14 animate-spin text-emerald-500" />
            <h2 className="text-xl font-bold text-slate-800">Confirming your payment…</h2>
            <p className="mt-2 text-slate-500 text-sm">
              Verifying with PayU servers. Please don't close this tab.
            </p>
            {pollCount > 0 && (
              <p className="mt-3 text-xs text-slate-400">
                Check {pollCount}/{POLL_MAX_ATTEMPTS} · Usually takes 3–8 seconds
              </p>
            )}
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-1 rounded-full bg-emerald-400 transition-all duration-500"
                style={{ width: `${Math.min(100, (pollCount / POLL_MAX_ATTEMPTS) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Success ── */}
        {phase === 'paid' && (
          <div className="rounded-2xl border border-emerald-200 bg-white shadow-xl overflow-hidden">
            {/* Green header strip */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-8 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40">
                <CheckCircle2 className="h-9 w-9 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Payment Successful!</h2>
              <p className="mt-1 text-emerald-100 text-sm">Your certificate order is confirmed</p>
            </div>

            <div className="px-8 py-6 space-y-4">
              {/* Order details */}
              {order && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                  {order.batch && (
                    <Row label="Program" value={order.batch.name} />
                  )}
                  {order.batch?.company && (
                    <Row label="Issued by" value={order.batch.company.name} />
                  )}
                  {order.certificate_serial && (
                    <Row label="Certificate ID" value={order.certificate_serial} mono />
                  )}
                  {txnid && (
                    <Row label="Transaction ID" value={txnid} mono />
                  )}
                  {order.amount && (
                    <Row label="Amount Paid" value={`₹${parseFloat(order.amount).toFixed(2)}`} highlight />
                  )}
                </div>
              )}

              {/* What's next */}
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <Award className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Your certificate is being prepared</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Once issued by the organization, you'll receive it in your dashboard and via email.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  Go to Dashboard <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <p className="text-center text-xs text-slate-400">
                Redirecting to dashboard automatically in 6 seconds…
              </p>
            </div>
          </div>
        )}

        {/* ── Pending ── */}
        {phase === 'pending' && (
          <div className="rounded-2xl border border-amber-200 bg-white p-10 text-center shadow-lg">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-9 w-9 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Payment Processing</h2>
            <p className="mt-3 text-slate-500 text-sm leading-relaxed">
              Your payment is being processed by the bank. This can take up to 5 minutes.
              Your certificate will appear in your dashboard once confirmed.
            </p>
            {txnid && (
              <p className="mt-4 text-xs font-mono text-slate-400 bg-slate-50 rounded-lg px-3 py-2 inline-block">
                Ref: {txnid}
              </p>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {phase === 'error' && (
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center shadow-lg">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-9 w-9 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Verification Issue</h2>
            <p className="mt-3 text-slate-500 text-sm leading-relaxed">
              We couldn't verify your payment status. If money was deducted from your account,
              please contact us with your transaction reference.
            </p>
            {txnid && (
              <p className="mt-4 text-xs font-mono text-slate-400 bg-slate-50 rounded-lg px-3 py-2 inline-block">
                Ref: {txnid}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                Go to Dashboard
              </button>
              <a
                href={`mailto:${COMPANY.email}?subject=Payment%20Issue%20-%20${txnid || 'Unknown'}`}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Mail className="h-4 w-4" /> Contact Support
              </a>
            </div>
          </div>
        )}

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

function Row({ label, value, mono, highlight }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500 shrink-0 mr-4">{label}</span>
      <span className={`text-right font-medium ${mono ? 'font-mono text-xs' : ''} ${highlight ? 'text-emerald-700 text-base font-bold' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  )
}
