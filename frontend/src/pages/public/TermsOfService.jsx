import { Link } from 'react-router-dom'
import { Award, ArrowLeft, FileText } from 'lucide-react'

function PolicyLayout({ title, effectiveDate, children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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

      {/* Page title */}
      <div className="bg-indigo-600 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-6 h-6 text-indigo-200" />
            <span className="text-indigo-200 text-sm font-medium uppercase tracking-wider">Legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{title}</h1>
          <p className="text-indigo-200 text-sm">Effective Date: {effectiveDate}</p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 prose prose-gray max-w-none">
          {children}
        </div>
      </main>

      {/* Footer */}
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

export default function TermsOfService() {
  return (
    <PolicyLayout title="Terms of Service" effectiveDate="April 2026">
      <div className="space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Validstep.com platform (the "Service"), available at{' '}
            <strong>validstep.com</strong>, you agree to be bound by these Terms of Service ("Terms").
            These Terms constitute a legally binding agreement between you and Validstep.com ("we", "us",
            or "our"). If you do not agree to these Terms, please do not use the Service.
          </p>
          <p className="mt-3">
            We reserve the right to update or modify these Terms at any time without prior notice. Continued
            use of the Service following any changes constitutes your acceptance of the revised Terms. The
            most current version of these Terms will always be available on this page with the effective date
            noted above.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. Description of Services</h2>
          <p>
            Validstep.com is a B2B Software-as-a-Service (SaaS) platform that enables organizations —
            including companies, educational institutions, training providers, and event organizers — to
            create, issue, manage, and deliver digital certificates to participants, employees, interns,
            students, and other program participants.
          </p>
          <p className="mt-3">
            The Service includes the following core capabilities:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1.5">
            <li>Organization account creation, profile management, and program administration</li>
            <li>Creation and management of certificate programs (Internship, Course, Hackathon, Participation, etc.)</li>
            <li>Participant batch management and enrollment via shareable links</li>
            <li>Certificate issuance with customizable templates (Classic, Modern, Minimal)</li>
            <li>Automated email delivery of certificates to participants</li>
            <li>Public QR-code-based and hash-based certificate verification</li>
            <li>Payment processing for participant-sponsored certificate programs</li>
            <li>PDF download of certificates and payment invoices</li>
            <li>Administrative dashboard with reporting and export features</li>
          </ul>
          <p className="mt-3">
            All certificates issued through this platform are <strong>digital only</strong>. No physical
            certificates, printed materials, or tangible goods are delivered under any circumstances. Delivery
            is exclusively via email and through the online participant dashboard.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. Account Registration</h2>

          <h3 className="text-lg font-semibold text-gray-800 mb-2">3.1 Organization Accounts (Companies)</h3>
          <p>
            Organizations must register an account to use the platform. During registration, you must provide
            accurate and complete information including your organization name, registered address, authorized
            contact person, and a valid business email address. You represent and warrant that all information
            provided is truthful and that you are authorized to act on behalf of your organization.
          </p>
          <p className="mt-2">
            Organization accounts are responsible for all activity conducted under the account, including
            managing programs, issuing certificates, setting payment terms, and all communications sent to
            participants. You must maintain the confidentiality of your login credentials and immediately
            notify us of any unauthorized access.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">3.2 Participant Accounts (Users)</h3>
          <p>
            Participants may register individual accounts to view their certificates, track order status, and
            download PDFs. Participant accounts require a valid name and email address. Participants accessing
            the platform via an organization's enrollment link agree to the collection and use of their data
            as outlined in our Privacy Policy.
          </p>
          <p className="mt-2">
            You must be at least 18 years of age to register an account on the platform. By registering,
            you represent that you meet this age requirement or have obtained parental consent.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Certificate Issuance</h2>
          <p>
            Certificates are issued at the sole discretion and authorization of the registered organization.
            Validstep.com acts only as a technology intermediary and does not independently validate,
            certify, accredit, or endorse the content, duration, quality, or legitimacy of any program
            described in a certificate.
          </p>
          <p className="mt-3">
            Organizations are fully responsible for the accuracy of information included in certificates,
            including participant names, program titles, dates, and any descriptive content. Validstep.com
            Verify shall not be held liable for errors, omissions, or misrepresentations in certificate
            content provided by the issuing organization.
          </p>
          <p className="mt-3">
            Once issued, certificates are assigned a unique verification hash and are permanently accessible
            via our public verification system at <strong>validstep.com/verify/[hash]</strong>.
            Organizations may revoke certificate visibility through administrative controls, but historical
            issuance records are retained in accordance with our data retention policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Payment Terms</h2>

          <h3 className="text-lg font-semibold text-gray-800 mb-2">5.1 Organization-Sponsored Model</h3>
          <p>
            In this model, the organization bears the cost of certificate issuance. The organization is billed
            for the total number of certificates issued in a batch. Payment is processed at the time of
            issuance or as per an agreed billing arrangement. GST-compliant invoices are issued to the
            organization for all transactions.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">5.2 Participant-Paid Model</h3>
          <p>
            In this model, individual participants are responsible for paying the certificate fee set by the
            organization. Payments are collected via our integrated payment gateway (PayU). Upon successful
            payment confirmation, the certificate is automatically issued and delivered to the participant.
            The organization configures the pricing; Validstep.com processes the transaction.
          </p>

          <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">5.3 Taxes</h3>
          <p>
            All fees are subject to applicable taxes including Goods and Services Tax (GST) as per Indian
            tax laws. Tax invoices will be provided where applicable. Organizations are responsible for
            any tax obligations arising from their use of the platform in their respective jurisdictions.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Intellectual Property</h2>
          <p>
            All content, design, software, trademarks, and materials on the Validstep.com platform —
            including but not limited to certificate templates, design systems, logos, interface design, and
            documentation — are the exclusive intellectual property of Validstep.com and are protected
            by applicable Indian and international copyright and trademark laws.
          </p>
          <p className="mt-3">
            Organizations and participants are granted a limited, non-exclusive, non-transferable license to
            use the platform solely for its intended purposes under these Terms. You may not copy, reproduce,
            distribute, reverse-engineer, or create derivative works from any part of the platform without
            express written permission from us.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Prohibited Uses</h2>
          <p>You agree not to use the platform to:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1.5">
            <li>Issue fraudulent, misleading, or fabricated certificates for programs that did not occur</li>
            <li>Impersonate any person, organization, institution, or entity</li>
            <li>Upload or transmit malicious software, viruses, or harmful code</li>
            <li>Conduct unauthorized scraping, crawling, or data harvesting of platform content</li>
            <li>Violate any applicable local, national, or international law or regulation</li>
            <li>Engage in any activity that disrupts or interferes with the functioning of the platform</li>
            <li>Use the platform to send spam or unsolicited communications</li>
            <li>Attempt to gain unauthorized access to any system, server, or account</li>
          </ul>
          <p className="mt-3">
            Violation of any prohibited use may result in immediate suspension or termination of your account
            without notice and without refund.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, Validstep.com shall not be liable for
            any indirect, incidental, special, consequential, or punitive damages, including loss of profits,
            data, goodwill, or business opportunities, arising from your use of or inability to use the
            Service, even if advised of the possibility of such damages.
          </p>
          <p className="mt-3">
            Our total aggregate liability to you for any claim arising from these Terms or your use of the
            platform shall not exceed the total amount paid by you to us in the three (3) months preceding
            the event giving rise to the claim.
          </p>
          <p className="mt-3">
            Validstep.com does not guarantee the continuous, uninterrupted, or error-free availability
            of the platform. We shall not be liable for any loss arising from system downtime, email delivery
            failures caused by third-party providers, or payment processing delays.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">9. Governing Law and Dispute Resolution</h2>
          <p>
            These Terms of Service shall be governed by and construed in accordance with the laws of India,
            without regard to its conflict of law provisions. Any disputes arising out of or relating to
            these Terms or the use of the platform shall be subject to the exclusive jurisdiction of the
            courts located in India.
          </p>
          <p className="mt-3">
            Prior to initiating formal legal proceedings, both parties agree to attempt resolution through
            good-faith negotiation. Disputes not resolved within thirty (30) days of written notice may be
            referred to arbitration under the Arbitration and Conciliation Act, 1996, as amended.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">10. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account and access to the platform at any time,
            with or without cause, and with or without notice, particularly in cases of violation of these
            Terms. You may also terminate your account at any time by contacting support. Upon termination,
            your right to use the platform ceases immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">11. Contact Us</h2>
          <p>
            For any questions, concerns, or notices regarding these Terms of Service, please contact us at:
          </p>
          <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="font-semibold text-gray-900">Validstep.com</p>
            <p className="text-sm mt-1">Email: <a href="mailto:support@validstep.com" className="text-indigo-600 hover:underline">support@validstep.com</a></p>
            <p className="text-sm">Website: <a href="https://validstep.com" className="text-indigo-600 hover:underline">validstep.com</a></p>
          </div>
        </section>

      </div>
    </PolicyLayout>
  )
}
