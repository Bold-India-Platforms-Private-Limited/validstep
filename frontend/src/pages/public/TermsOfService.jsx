import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">Terms of Service</h1>
          <p className="mb-8 text-sm text-slate-400">Last updated: April 2025</p>

          <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Acceptance of Terms</h2>
              <p className="text-sm leading-relaxed">By accessing or using ValidStep ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Platform.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">2. Services</h2>
              <p className="text-sm leading-relaxed">ValidStep provides digital certificate issuance and verification services. Companies may create programs and batches, while users may purchase and receive certificates upon successful completion of requirements.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">3. User Responsibilities</h2>
              <ul className="text-sm leading-relaxed list-disc list-inside space-y-1">
                <li>Provide accurate information during registration and ordering</li>
                <li>Keep account credentials confidential</li>
                <li>Not misuse or attempt to forge certificates</li>
                <li>Comply with all applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Company Responsibilities</h2>
              <ul className="text-sm leading-relaxed list-disc list-inside space-y-1">
                <li>Ensure certificate information is accurate and truthful</li>
                <li>Issue certificates only to eligible recipients</li>
                <li>Maintain compliance with applicable certification standards</li>
                <li>Not engage in fraudulent certificate issuance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Payments</h2>
              <p className="text-sm leading-relaxed">All payments are processed securely through PayU. ValidStep charges a platform fee on each transaction. Prices are displayed in Indian Rupees (INR) and are inclusive of applicable taxes.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">6. Intellectual Property</h2>
              <p className="text-sm leading-relaxed">ValidStep retains ownership of the Platform. Certificate content belongs to the issuing company. Users are granted a non-exclusive license to display and share their certificates.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">7. Limitation of Liability</h2>
              <p className="text-sm leading-relaxed">ValidStep is not liable for any indirect, incidental, or consequential damages arising from use of the Platform. Our liability is limited to the amount paid for the specific service in question.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">8. Termination</h2>
              <p className="text-sm leading-relaxed">We reserve the right to suspend or terminate accounts that violate these terms. Users may close their accounts at any time by contacting support.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">9. Changes to Terms</h2>
              <p className="text-sm leading-relaxed">We may update these terms periodically. Continued use of the Platform after changes constitutes acceptance of the revised terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">10. Contact</h2>
              <p className="text-sm leading-relaxed">For questions about these terms, please contact us at <a href="mailto:legal@validstep.com" className="text-primary-600 hover:underline">legal@validstep.com</a>.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
