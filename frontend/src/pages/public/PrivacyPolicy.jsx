import { Link } from 'react-router-dom'
import { Award, ArrowLeft, Shield } from 'lucide-react'

function PolicyLayout({ title, effectiveDate, children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base">Validstep.com</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <div className="bg-indigo-600 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-indigo-200" />
            <span className="text-indigo-200 text-sm font-medium uppercase tracking-wider">Legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{title}</h1>
          <p className="text-indigo-200 text-sm">Effective Date: {effectiveDate}</p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 prose prose-gray max-w-none">
          {children}
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-4 justify-center text-sm text-gray-500">
          <Link to="/" className="hover:text-indigo-600">Home</Link>
          <Link to="/terms" className="hover:text-indigo-600">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-indigo-600">Privacy Policy</Link>
          <Link to="/refund" className="hover:text-indigo-600">Refund Policy</Link>
          <Link to="/delivery" className="hover:text-indigo-600">Delivery Policy</Link>
        </div>
      </footer>
    </div>
  )
}

export default function PrivacyPolicy() {
  return (
    <PolicyLayout title="Privacy Policy" effectiveDate="April 2026">
      <div className="space-y-8 text-gray-700 leading-relaxed">

        <section>
          <p className="text-gray-600 text-base leading-relaxed border-l-4 border-indigo-200 pl-4 py-1 bg-indigo-50 rounded-r-lg">
            At Validstep.com, we are committed to protecting your personal information and your right to
            privacy. This Privacy Policy explains how we collect, use, store, and protect your information
            when you use our platform at <strong>validstep.com</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
          <p>
            We collect information necessary to provide our certificate issuance and verification services.
            The types of data we collect include:
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">1.1 Personal Identification Data</h3>
          <ul className="list-disc pl-6 mt-2 space-y-1.5">
            <li><strong>Full Name:</strong> Required for certificate personalization and account registration</li>
            <li><strong>Email Address:</strong> Used for account access, certificate delivery, and communications</li>
            <li><strong>Phone Number:</strong> Collected optionally for account verification and support purposes</li>
            <li><strong>Organization Name and Details:</strong> Collected from company accounts for profile setup and invoicing</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">1.2 Payment and Transaction Data</h3>
          <p>
            When participants make payments for certificates, payment transactions are processed by our
            third-party payment gateway, <strong>PayU</strong>. We do not store full credit card or debit
            card numbers, CVV codes, or bank account credentials on our servers. We may retain:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1.5">
            <li>Transaction ID and payment reference numbers</li>
            <li>Payment status (success, failure, pending)</li>
            <li>Amount and currency of transaction</li>
            <li>Last four digits of card (if provided by payment gateway)</li>
            <li>UPI virtual payment address (VPA) in masked form</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">1.3 Certificate and Program Data</h3>
          <ul className="list-disc pl-6 mt-2 space-y-1.5">
            <li>Program enrollment records and batch assignments</li>
            <li>Certificate issuance timestamps and unique verification hashes</li>
            <li>Certificate content as submitted by the issuing organization</li>
          </ul>

          <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">1.4 Technical and Usage Data</h3>
          <ul className="list-disc pl-6 mt-2 space-y-1.5">
            <li>IP address and browser type at time of login or certificate verification</li>
            <li>Device type and operating system</li>
            <li>Pages visited, actions taken, and session duration (for improving platform performance)</li>
            <li>Error logs and diagnostic data for debugging purposes</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
          <p>We use the information we collect for the following specific purposes:</p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li><strong>Certificate Issuance:</strong> To generate, personalize, and issue digital certificates on behalf of organizations</li>
            <li><strong>Email Delivery:</strong> To send certificates, payment confirmations, and account-related communications to participants</li>
            <li><strong>Certificate Verification:</strong> To enable public or private verification of issued certificates via unique URLs and QR codes</li>
            <li><strong>Account Management:</strong> To create and manage your account, authenticate your identity, and provide customer support</li>
            <li><strong>Payment Processing:</strong> To facilitate and record payments for certificate services via PayU</li>
            <li><strong>Platform Improvement:</strong> To analyze usage patterns and improve the platform's features and performance</li>
            <li><strong>Legal Compliance:</strong> To comply with applicable laws, respond to legal requests, and prevent fraud or abuse</li>
            <li><strong>Communications:</strong> To send important service updates, policy changes, or security notices</li>
          </ul>
          <p className="mt-3">
            We do not sell, rent, or trade your personal information to any third party for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. Data Storage and Security</h2>
          <p>
            All personal data collected through the Validstep.com platform is stored on secure servers
            located in <strong>India</strong>. We implement industry-standard security measures to protect
            your data including:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1.5">
            <li>SSL/TLS encryption for all data transmitted between your browser and our servers</li>
            <li>Encrypted storage of sensitive fields in our database</li>
            <li>Role-based access controls to restrict data access to authorized personnel only</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Secure, hashed storage of passwords using industry-standard algorithms</li>
          </ul>
          <p className="mt-3">
            While we take all reasonable precautions, no method of data transmission or storage over the
            internet is 100% secure. We cannot guarantee absolute security, and you share information at
            your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Cookies and Tracking Technologies</h2>
          <p>
            We use cookies and similar technologies to enhance your experience on the platform. Cookies are
            small text files placed on your device that help us:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1.5">
            <li>Maintain your authenticated session (essential cookies)</li>
            <li>Remember your preferences and settings</li>
            <li>Analyze platform performance and usage patterns</li>
            <li>Prevent unauthorized access and detect suspicious activity</li>
          </ul>
          <p className="mt-3">
            We use session cookies (which expire when you close your browser) and persistent cookies (which
            remain until cleared). You may disable cookies through your browser settings, but certain
            features of the platform may not function correctly without them.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Third-Party Services</h2>
          <p>
            We work with carefully selected third-party service providers who help us operate the platform.
            These providers access your data only to the extent necessary to provide their services:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li>
              <strong>PayU (Payment Processing):</strong> PayU processes all payment transactions on our
              platform. Your payment data is governed by PayU's Privacy Policy. We recommend reviewing their
              policy at payu.in. We share only the minimum required data (name, email, amount) to facilitate
              payment.
            </li>
            <li>
              <strong>Email Service Provider:</strong> We use a transactional email service to deliver
              certificates and notifications. Email addresses and certificate content are shared only for
              delivery purposes.
            </li>
            <li>
              <strong>Cloud Infrastructure:</strong> Our platform is hosted on cloud infrastructure
              located within India to ensure data residency compliance.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Sharing and Disclosure</h2>
          <p>We do not share your personal data except in the following circumstances:</p>
          <ul className="list-disc pl-6 mt-3 space-y-1.5">
            <li>With the organization that issued your certificate (they are the data controller for their programs)</li>
            <li>With our authorized service providers as described above</li>
            <li>When required by law, court order, or lawful request from a government authority</li>
            <li>To protect the rights, property, or safety of Validstep.com, our users, or others</li>
            <li>In connection with a merger, acquisition, or sale of business assets (with prior notice)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Your Rights</h2>
          <p>
            As a user of the Validstep.com platform, you have the following rights regarding your
            personal data:
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2">
            <li><strong>Right to Access:</strong> You may request a copy of the personal data we hold about you</li>
            <li><strong>Right to Correction:</strong> You may request correction of inaccurate or incomplete data</li>
            <li><strong>Right to Deletion:</strong> You may request deletion of your account and personal data, subject to legal retention requirements</li>
            <li><strong>Right to Portability:</strong> You may request your data in a machine-readable format</li>
            <li><strong>Right to Withdraw Consent:</strong> Where processing is based on consent, you may withdraw it at any time</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:support@validstep.com" className="text-indigo-600 hover:underline">
              support@validstep.com
            </a>. We will respond within 30 days of your request.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">8. Data Retention</h2>
          <p>
            We retain personal data for as long as necessary to provide the Service and comply with legal
            obligations. Issued certificate records are retained indefinitely to support permanent
            verification capabilities. Account data is retained for the duration of the account's active
            status and for a period thereafter as required by applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">9. Children's Privacy</h2>
          <p>
            Our platform is not intended for use by individuals under the age of 18. We do not knowingly
            collect personal data from minors. If we become aware that we have inadvertently collected data
            from a minor, we will take steps to delete such information promptly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">10. Contact Us</h2>
          <p>
            If you have any questions, concerns, or requests related to this Privacy Policy or the handling
            of your personal data, please contact us:
          </p>
          <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="font-semibold text-gray-900">Validstep.com — Privacy Team</p>
            <p className="text-sm mt-1">
              Email:{' '}
              <a href="mailto:support@validstep.com" className="text-indigo-600 hover:underline">
                support@validstep.com
              </a>
            </p>
            <p className="text-sm">
              Website:{' '}
              <a href="https://validstep.com" className="text-indigo-600 hover:underline">
                validstep.com
              </a>
            </p>
          </div>
        </section>

      </div>
    </PolicyLayout>
  )
}
