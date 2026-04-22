import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function DeliveryPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">Delivery Policy</h1>
          <p className="mb-8 text-sm text-slate-400">Last updated: April 2025</p>

          <div className="space-y-6 text-slate-700">
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Digital Delivery</h2>
              <p className="text-sm leading-relaxed">ValidStep is a fully digital platform. All certificates are delivered electronically — there are no physical products shipped. This policy governs the delivery of digital certificates and related services.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">2. Certificate Delivery Timeline</h2>
              <p className="text-sm leading-relaxed mb-2">After successful payment:</p>
              <ul className="text-sm leading-relaxed list-disc list-inside space-y-1">
                <li>Your order is confirmed immediately</li>
                <li>The issuing company reviews and approves your application</li>
                <li>Once approved, certificates are generated and available in your dashboard</li>
                <li>Typical processing time: 1–5 business days (varies by company)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">3. Accessing Your Certificate</h2>
              <p className="text-sm leading-relaxed">Once issued, you can access your certificate by:</p>
              <ul className="text-sm leading-relaxed list-disc list-inside space-y-1 mt-2">
                <li>Logging into your ValidStep account and visiting the Dashboard</li>
                <li>Downloading the PDF directly from your certificate page</li>
                <li>Sharing the unique verification URL with anyone</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Certificate Format</h2>
              <p className="text-sm leading-relaxed">Certificates are delivered as downloadable PDF documents in A4 landscape format. They include a unique certificate ID, QR code for verification, and all relevant program and participant details.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Verification</h2>
              <p className="text-sm leading-relaxed">Every certificate includes a unique verification hash accessible at <span className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">validstep.com/verify/[hash]</span>. This allows employers, institutions, or anyone to verify authenticity instantly without logging in.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">6. Delays</h2>
              <p className="text-sm leading-relaxed">If your certificate has not been issued within 7 business days of payment, please contact us at <a href="mailto:support@validstep.com" className="text-primary-600 hover:underline">support@validstep.com</a> with your order details.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">7. Contact</h2>
              <p className="text-sm leading-relaxed">For delivery inquiries: <a href="mailto:support@validstep.com" className="text-primary-600 hover:underline">support@validstep.com</a></p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
