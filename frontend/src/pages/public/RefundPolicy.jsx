import { Link } from 'react-router-dom'
import { Award, ArrowLeft, AlertTriangle, CheckCircle, Mail } from 'lucide-react'

function PolicyLayout({ title, effectiveDate, children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Award className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-base">
              ListedIndia<span className="text-indigo-600"> Verify</span>
            </span>
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
            <AlertTriangle className="w-6 h-6 text-indigo-200" />
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

export default function RefundPolicy() {
  return (
    <PolicyLayout title="Refund Policy" effectiveDate="April 2026">
      <div className="space-y-8 text-gray-700 leading-relaxed">

        {/* No Refund Banner */}
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 flex gap-4">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800 text-lg mb-1">No Refund Policy</p>
            <p className="text-red-700 text-sm leading-relaxed">
              All payments made on the ListedIndia Verify platform are <strong>strictly non-refundable</strong>.
              By completing a payment, you acknowledge and agree to this policy. Please read all details below
              before making a purchase.
            </p>
          </div>
        </div>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. General No-Refund Policy</h2>
          <p>
            ListedIndia Verify provides a digital service — the issuance and delivery of digital certificates.
            All fees paid for certificate services are <strong>non-refundable</strong> once the payment has
            been successfully processed. This policy applies to all users, including both individual participants
            and registered organizations.
          </p>
          <p className="mt-3">
            The nature of digital products means that once a certificate is issued and delivered, the service
            has been fully rendered. Unlike physical goods, digital certificates cannot be "returned" or
            "undelivered" once issued to a recipient. For this reason, we maintain a strict no-refund policy
            for all completed transactions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. Certificate Fees — Non-Refundable</h2>
          <p>
            Certificate fees — whether paid by participants directly or by organizations on behalf of their
            participants — are entirely non-refundable once the payment is confirmed and processed by our
            payment gateway (PayU).
          </p>
          <p className="mt-3">
            This applies in all circumstances, including but not limited to:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1.5">
            <li>Participant changes their mind after purchasing a certificate</li>
            <li>Participant provided incorrect name or email at the time of order</li>
            <li>Participant no longer needs the certificate after payment</li>
            <li>Organization decides to cancel a program after participants have paid</li>
            <li>Participant disputes the content of the certificate (content is the organization's responsibility)</li>
          </ul>
          <p className="mt-3">
            If you entered incorrect details, please contact us promptly at{' '}
            <a href="mailto:support@listedindia.com" className="text-indigo-600 hover:underline">
              support@listedindia.com
            </a>{' '}
            — we may be able to correct information on an already-issued certificate in certain circumstances,
            at our sole discretion, but no refund will be issued.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. Digital Product — No Physical Return</h2>
          <p>
            All certificates issued on the ListedIndia Verify platform are purely digital. We do not offer
            any physical delivery of certificates, printed materials, or any tangible product. As a digital
            product, once issued, the certificate cannot be "returned" in any conventional sense.
          </p>
          <p className="mt-3">
            The moment a certificate is issued by an organization administrator, the full service has been
            provided. The certificate is:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1.5">
            <li>Immediately available on the participant's dashboard for download</li>
            <li>Sent to the participant's registered email address</li>
            <li>Publicly verifiable via a unique QR code and hash link</li>
          </ul>
          <p className="mt-3">
            Once these events have occurred, the service has been fully and irreversibly delivered.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Payment Failures and Gateway Errors</h2>
          <p>
            If a payment fails during processing — meaning the transaction was initiated but not completed —
            no charge will be applied to your account. In cases where a technical error results in a
            duplicate charge or a charge where no service was delivered, refunds for such erroneous
            transactions will be processed automatically by the payment gateway (PayU) within the standard
            processing period of 5–7 business days.
          </p>
          <p className="mt-3">
            If you believe you have been incorrectly charged for a failed transaction that was not
            automatically reversed, please contact us at{' '}
            <a href="mailto:support@listedindia.com" className="text-indigo-600 hover:underline">
              support@listedindia.com
            </a>{' '}
            with your transaction reference number. We will investigate and coordinate with PayU to resolve
            the issue.
          </p>
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">
              <strong>Note:</strong> Refunds for payment gateway errors (duplicate charges or payment
              debited without service delivery) are handled as exceptions and are processed through PayU's
              dispute resolution mechanism, not as voluntary refunds by ListedIndia Verify.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Organization / Company Account Fees</h2>
          <p>
            Any fees paid by organizations for account setup, subscription plans, or service activation on
            the ListedIndia Verify platform are strictly non-refundable. This includes:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1.5">
            <li>One-time account setup or onboarding fees (if applicable)</li>
            <li>Subscription or platform access fees for any billing period</li>
            <li>Any customization or white-label service fees agreed upon</li>
          </ul>
          <p className="mt-3">
            Organizations are encouraged to evaluate the platform thoroughly via a trial or demo period
            before committing to a paid plan. Once payment is made for organization-level services,
            no refund will be issued regardless of usage level.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Technical Issues — Support First</h2>
          <p>
            If you experience a technical issue with the platform — such as a certificate not being delivered,
            an error in certificate generation, or inability to access your dashboard — please contact our
            support team before assuming a refund is required. Many technical issues can be resolved promptly:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1.5">
            <li>Re-sending a certificate email to a participant</li>
            <li>Correcting a certificate issuance error caused by a platform bug</li>
            <li>Restoring access to a certificate after a technical outage</li>
          </ul>
          <p className="mt-3">
            Technical issues caused by platform errors on our end will be resolved at no additional cost.
            These do not entitle users to a monetary refund but will be remedied with corrected service delivery.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Contact for Refund-Related Queries</h2>
          <p>
            For any questions or disputes related to payments, please contact our support team. While we
            maintain a strict no-refund policy, we are committed to resolving service-related concerns
            fairly and promptly.
          </p>
          <div className="mt-4 p-5 bg-gray-50 rounded-xl border border-gray-200 flex gap-3">
            <Mail className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">ListedIndia Verify Support</p>
              <p className="text-sm text-gray-600 mt-1">
                Email:{' '}
                <a href="mailto:support@listedindia.com" className="text-indigo-600 hover:underline">
                  support@listedindia.com
                </a>
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Please include your transaction ID, registered email address, and a description of your issue.
                We respond within 2 business days.
              </p>
            </div>
          </div>
        </section>

      </div>
    </PolicyLayout>
  )
}
