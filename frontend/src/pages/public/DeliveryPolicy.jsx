import { Link } from 'react-router-dom'
import { Award, ArrowLeft, Truck, Mail, Download, Clock, QrCode, Globe } from 'lucide-react'

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
            <Truck className="w-6 h-6 text-indigo-200" />
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

export default function DeliveryPolicy() {
  return (
    <PolicyLayout title="Delivery Policy" effectiveDate="April 2026">
      <div className="space-y-8 text-gray-700 leading-relaxed">

        {/* Key Highlight Banner */}
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6 flex gap-4">
          <Globe className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-indigo-800 text-lg mb-1">100% Online Delivery</p>
            <p className="text-indigo-700 text-sm leading-relaxed">
              Validstep.com is a fully digital platform. All certificates are delivered electronically —
              via email and the participant dashboard. <strong>No physical certificates, printed documents,
              or courier deliveries are provided under any circumstances.</strong>
            </p>
          </div>
        </div>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Nature of Delivery — Digital Only</h2>
          <p>
            Validstep.com delivers exclusively digital certificates. We are a Software-as-a-Service
            (SaaS) platform and do not produce, print, ship, or courier any physical goods. All certificate
            products are intangible, digital assets delivered through electronic means.
          </p>
          <p className="mt-3">
            This policy outlines how, when, and where your digital certificate will be delivered upon
            issuance by the relevant organization. By using our platform, you acknowledge and accept that
            delivery is exclusively electronic and no physical delivery will occur.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. Delivery Channels</h2>
          <p>
            Certificates are delivered through two primary channels, both of which are activated
            simultaneously upon issuance:
          </p>

          <div className="mt-4 grid sm:grid-cols-2 gap-4 not-prose">
            {/* Email Delivery */}
            <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Mail className="w-4 h-4 text-white" />
                </div>
                <p className="font-bold text-blue-900">Email Delivery</p>
              </div>
              <ul className="text-sm text-blue-800 space-y-1.5">
                <li>• Sent automatically upon issuance</li>
                <li>• Delivered to registered email address</li>
                <li>• Includes PDF certificate attachment</li>
                <li>• Contains verification link and QR code</li>
                <li>• Re-sendable by organization if needed</li>
              </ul>
            </div>

            {/* Dashboard */}
            <div className="p-5 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                  <Download className="w-4 h-4 text-white" />
                </div>
                <p className="font-bold text-green-900">Participant Dashboard</p>
              </div>
              <ul className="text-sm text-green-800 space-y-1.5">
                <li>• Instantly accessible after issuance</li>
                <li>• Download PDF certificate anytime</li>
                <li>• View certificate details and status</li>
                <li>• Access payment invoice if applicable</li>
                <li>• Share verification link directly</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. Delivery Timeline</h2>

          <h3 className="text-lg font-semibold text-gray-800 mb-2">3.1 Issuance by Organization</h3>
          <p>
            Certificate issuance is controlled by the organization's administrator. The timeline from program
            completion to certificate issuance depends on when the organization's admin approves and issues
            the certificates on the platform. This is outside Validstep.com's direct control.
          </p>
          <p className="mt-2">
            Once an organization admin clicks "Issue Certificate" for a participant or batch of participants,
            the delivery process is triggered immediately.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">3.2 Email Delivery</h3>
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mt-2">
            <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              <strong>Delivery within minutes:</strong> Certificate emails are sent within{' '}
              <strong>5–15 minutes</strong> of issuance under normal conditions. During high-volume periods,
              delivery may take up to 30 minutes. If you have not received your email within 24 hours of
              issuance, please contact support.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">3.3 Dashboard Availability</h3>
          <p>
            The certificate is available on the participant's dashboard <strong>immediately upon issuance</strong>
            — there is no delay for dashboard access. Participants can log in and download their PDF at any
            time after issuance, even before the email is received.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">3.4 Participant-Paid Programs</h3>
          <p>
            For programs where participants pay for their certificate, delivery follows this timeline:
          </p>
          <ol className="list-decimal pl-6 mt-2 space-y-1.5">
            <li>Participant completes payment via PayU</li>
            <li>Payment confirmation is received (typically instant for UPI/cards)</li>
            <li>Certificate is automatically queued for issuance</li>
            <li>Certificate is issued and email sent within 5–15 minutes of payment confirmation</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. How to Access Your Certificate</h2>
          <p>There are multiple ways to access your digital certificate:</p>

          <div className="mt-4 space-y-4 not-prose">
            <div className="flex gap-4 p-4 border border-gray-200 rounded-xl">
              <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Via Email</p>
                <p className="text-sm text-gray-600 mt-0.5">Check your registered email inbox for a message from Validstep.com. The email contains your certificate as a PDF attachment and includes a direct verification link.</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 border border-gray-200 rounded-xl">
              <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Via Participant Dashboard</p>
                <p className="text-sm text-gray-600 mt-0.5">Log in at <Link to="/auth/user/login" className="text-indigo-600 hover:underline">validstep.com</Link> with your registered account. Navigate to your Certificates section to view and download all your certificates.</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 border border-gray-200 rounded-xl">
              <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg font-bold text-sm flex items-center justify-center flex-shrink-0">3</div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Via Verification Link</p>
                <p className="text-sm text-gray-600 mt-0.5">Each certificate has a unique public verification URL (e.g., validstep.com/verify/[hash]) that can be accessed without login for verification purposes.</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Public Verification</h2>
          <div className="flex gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl mt-2 not-prose">
            <QrCode className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">
              Every certificate includes a QR code and a unique verification link. These become active
              <strong> immediately upon issuance</strong> and remain permanently active. Employers, institutions,
              or any third party can verify the authenticity of a certificate by scanning the QR code or
              visiting the verification link — no login required.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Non-Delivery and Support</h2>
          <p>
            If you have not received your certificate within <strong>24 hours of issuance</strong>, please
            take the following steps before contacting support:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1.5">
            <li>Check your spam or junk email folder for an email from Validstep.com</li>
            <li>Verify the email address registered with your account is correct</li>
            <li>Log in to your participant dashboard to check if the certificate is available there</li>
            <li>Confirm with your organization that your certificate has been issued</li>
          </ul>
          <p className="mt-3">
            If none of the above resolves the issue, please contact our support team with:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1.5">
            <li>Your registered email address</li>
            <li>The name of the program or organization</li>
            <li>Transaction ID (if applicable)</li>
            <li>Approximate issuance date</li>
          </ul>
          <div className="mt-4 p-5 bg-indigo-50 rounded-xl border border-indigo-200 not-prose">
            <p className="font-semibold text-gray-900 text-sm">Contact Support</p>
            <p className="text-sm text-gray-600 mt-1">
              Email:{' '}
              <a href="mailto:support@validstep.com" className="text-indigo-600 hover:underline">
                support@validstep.com
              </a>
            </p>
            <p className="text-sm text-gray-500 mt-1">Response time: Within 24–48 business hours.</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Summary</h2>
          <div className="overflow-x-auto not-prose">
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Item</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Delivery Method', 'Digital only — Email + Online Dashboard'],
                  ['Physical Delivery', 'Not available under any circumstances'],
                  ['Email Delivery Time', 'Within 5–15 minutes of issuance'],
                  ['Dashboard Access', 'Immediate upon issuance'],
                  ['Verification Active', 'Immediately and permanently'],
                  ['PDF Download', 'Available anytime from dashboard'],
                  ['Support Response', 'Within 24–48 business hours'],
                ].map(([item, detail]) => (
                  <tr key={item} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{item}</td>
                    <td className="px-4 py-3 text-gray-600">{detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </PolicyLayout>
  )
}
