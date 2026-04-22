import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">Refund Policy</h1>
          <p className="mb-8 text-sm text-slate-400">Last updated: April 2025</p>

          <div className="space-y-6 text-slate-700">
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Payment Processing</h2>
              <p className="text-sm leading-relaxed">All payments on ValidStep are processed through PayU, a secure payment gateway. Once a payment is successfully processed and a certificate is issued, the transaction is considered complete.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">2. Eligibility for Refunds</h2>
              <p className="text-sm leading-relaxed mb-2">Refunds may be considered in the following circumstances:</p>
              <ul className="text-sm leading-relaxed list-disc list-inside space-y-1">
                <li>Payment was deducted but certificate was not issued within 7 business days</li>
                <li>Duplicate payment was made for the same order</li>
                <li>Technical error caused incorrect charging</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">3. Non-Refundable Cases</h2>
              <ul className="text-sm leading-relaxed list-disc list-inside space-y-1">
                <li>Certificate has already been successfully issued</li>
                <li>User-initiated cancellation after payment success</li>
                <li>Change of mind after purchase</li>
                <li>Incorrect information submitted by the user</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Refund Process</h2>
              <p className="text-sm leading-relaxed">To request a refund, contact us within 7 days of the payment date at <a href="mailto:support@validstep.com" className="text-primary-600 hover:underline">support@validstep.com</a> with your order details and transaction ID. Approved refunds are processed within 5–10 business days to the original payment method.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Failed Payments</h2>
              <p className="text-sm leading-relaxed">If a payment fails, no amount is deducted. If you notice an unexpected deduction without receiving a certificate, contact us immediately with your transaction ID.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">6. Contact</h2>
              <p className="text-sm leading-relaxed">For refund requests: <a href="mailto:support@validstep.com" className="text-primary-600 hover:underline">support@validstep.com</a></p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
