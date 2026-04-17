import { Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Mail, Globe, Building2, Hash, Calendar, ExternalLink } from 'lucide-react'

export default function Contact() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.webp" alt="Validstep" className="h-8 w-auto" />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-violet-600 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Page hero */}
      <div className="bg-gradient-to-br from-violet-700 to-indigo-700 py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <img src="/greenverify.svg" alt="" style={{ width: 20, height: 20, filter: 'brightness(0) invert(1)' }} />
            <span className="text-violet-200 text-sm font-medium uppercase tracking-wider">Get in Touch</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Contact Us</h1>
          <p className="text-violet-200 text-sm max-w-lg">
            Have a question about Validstep or want to explore how we can help your organisation? Reach out — we'd love to hear from you.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">

        {/* Validstep contact */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
              <img src="/logo.webp" alt="" className="h-6 w-auto" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Certificate infrastructure for modern organisations</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <ContactCard
              icon={<Mail className="w-5 h-5 text-violet-600" />}
              label="Email Us"
              bg="bg-violet-50"
            >
              <a href="mailto:hello@boldindia.in" className="text-violet-700 font-semibold hover:underline">
                hello@boldindia.in
              </a>
            </ContactCard>

            <ContactCard
              icon={<Globe className="w-5 h-5 text-violet-600" />}
              label="Visit Website"
              bg="bg-violet-50"
            >
              <a href="https://www.boldindia.in" target="_blank" rel="noopener noreferrer"
                className="text-violet-700 font-semibold hover:underline flex items-center gap-1">
                www.boldindia.in <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </ContactCard>

            <ContactCard
              icon={<MapPin className="w-5 h-5 text-violet-600" />}
              label="Office Address"
              bg="bg-violet-50"
              className="sm:col-span-2"
            >
              <address className="not-italic text-gray-700 leading-relaxed">
                Sn 242/1/2 Baner, Tejaswini Soc, DP Road, N.I.A.,<br />
                Pune, Maharashtra 411045, India
              </address>
            </ContactCard>
          </div>
        </div>

        {/* Legal / parent company */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Parent Legal Company</h2>
              <p className="text-sm text-gray-500">Registered entity operating Validstep.com</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <ContactCard
              icon={<Building2 className="w-5 h-5 text-gray-600" />}
              label="Company Name"
              bg="bg-gray-50"
            >
              <p className="text-gray-800 font-semibold">Bold India Platforms Private Limited</p>
            </ContactCard>

            <ContactCard
              icon={<Hash className="w-5 h-5 text-gray-600" />}
              label="CIN"
              bg="bg-gray-50"
            >
              <p className="text-gray-800 font-mono font-semibold">U85499PN2025PTC246360</p>
            </ContactCard>

            <ContactCard
              icon={<Calendar className="w-5 h-5 text-gray-600" />}
              label="Incorporated"
              bg="bg-gray-50"
            >
              <p className="text-gray-800 font-semibold">2025 · Pune, Maharashtra, India</p>
            </ContactCard>

            <ContactCard
              icon={<Globe className="w-5 h-5 text-gray-600" />}
              label="Website"
              bg="bg-gray-50"
            >
              <a href="https://www.boldindia.in" target="_blank" rel="noopener noreferrer"
                className="text-violet-700 font-semibold hover:underline flex items-center gap-1">
                www.boldindia.in <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </ContactCard>
          </div>
        </div>

        {/* Map placeholder / note */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex items-start gap-4">
          <img src="/greenverify.svg" alt="" style={{ width: 20, height: 20, flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-sm font-semibold text-indigo-800 mb-1">We typically respond within 1 business day</p>
            <p className="text-sm text-indigo-600">
              For product enquiries, partnerships, or support, email us at{' '}
              <a href="mailto:hello@boldindia.in" className="font-semibold underline">hello@boldindia.in</a>.
              For certificate verification help, use the{' '}
              <Link to="/verify/demo" className="font-semibold underline">Verify Certificate</Link> tool.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-4 justify-center text-sm text-gray-500">
          <Link to="/" className="hover:text-violet-600">Home</Link>
          <Link to="/about" className="hover:text-violet-600">About</Link>
          <Link to="/terms" className="hover:text-violet-600">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-violet-600">Privacy Policy</Link>
          <Link to="/refund" className="hover:text-violet-600">Refund Policy</Link>
          <Link to="/delivery" className="hover:text-violet-600">Delivery Policy</Link>
        </div>
      </footer>
    </div>
  )
}

function ContactCard({ icon, label, bg, children, className = '' }) {
  return (
    <div className={`${bg} rounded-xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  )
}
