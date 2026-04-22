import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="mb-8 text-sm text-slate-400">Last updated: April 2025</p>

          <div className="space-y-6 text-slate-700">
            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">1. Information We Collect</h2>
              <p className="text-sm leading-relaxed mb-2">We collect information you provide directly:</p>
              <ul className="text-sm leading-relaxed list-disc list-inside space-y-1">
                <li>Name, email address, and phone number during registration</li>
                <li>Payment information (processed securely by PayU — we do not store card details)</li>
                <li>Certificate-related data (program, batch, role, duration)</li>
                <li>Usage data and logs for security and performance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">2. How We Use Your Information</h2>
              <ul className="text-sm leading-relaxed list-disc list-inside space-y-1">
                <li>To provide and improve our certificate services</li>
                <li>To process payments and issue certificates</li>
                <li>To send transaction and service-related communications</li>
                <li>To detect and prevent fraud and abuse</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">3. Information Sharing</h2>
              <p className="text-sm leading-relaxed">We do not sell your personal information. We share data only with:</p>
              <ul className="text-sm leading-relaxed list-disc list-inside space-y-1 mt-2">
                <li>The issuing company (your name and certificate details)</li>
                <li>PayU for payment processing</li>
                <li>Service providers under confidentiality agreements</li>
                <li>Law enforcement when required by law</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">4. Data Security</h2>
              <p className="text-sm leading-relaxed">We use industry-standard encryption and security practices to protect your data. Passwords are hashed using bcrypt. All API communications use HTTPS.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">5. Cookies</h2>
              <p className="text-sm leading-relaxed">We use HTTP-only cookies for authentication sessions. These are essential for the service to function and cannot be disabled. We do not use tracking or advertising cookies.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">6. Data Retention</h2>
              <p className="text-sm leading-relaxed">We retain account data for as long as your account is active. Certificate records are retained indefinitely to support verification. You may request deletion of non-certificate data by contacting us.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">7. Your Rights</h2>
              <p className="text-sm leading-relaxed">You have the right to access, correct, or request deletion of your personal data. Contact us at <a href="mailto:privacy@validstep.com" className="text-primary-600 hover:underline">privacy@validstep.com</a> for any privacy-related requests.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">8. Changes to This Policy</h2>
              <p className="text-sm leading-relaxed">We may update this policy periodically. We will notify users of significant changes via email or a prominent notice on the Platform.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">9. Contact</h2>
              <p className="text-sm leading-relaxed">For privacy inquiries: <a href="mailto:privacy@validstep.com" className="text-primary-600 hover:underline">privacy@validstep.com</a></p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
