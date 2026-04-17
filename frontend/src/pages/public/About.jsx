import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Globe, Mail, MapPin, ExternalLink } from 'lucide-react'

const features = [
  'Issue branded digital certificates in minutes — no design skills needed',
  'Tamper-proof QR codes for instant public verification',
  'Bulk issuance for entire batches of participants',
  'Custom programs: courses, workshops, internships, memberships',
  'Real-time dashboard with delivery and open-rate analytics',
  'PayU-powered secure payments — fully compliant with Indian regulations',
  'Participant self-serve portal to view, download, and share certificates',
  'Public verification page — no login required for employers or institutions',
]

const useCases = [
  { emoji: '🏫', title: 'Educational Institutions', desc: 'Award course completion, merit, and attendance certificates at scale.' },
  { emoji: '🏢', title: 'Corporates & HR Teams', desc: 'Issue training, onboarding, and recognition certificates to employees.' },
  { emoji: '🎓', title: 'EdTech Platforms', desc: 'Automate certificate delivery for every learner upon course completion.' },
  { emoji: '🤝', title: 'NGOs & Non-profits', desc: 'Recognise volunteers, interns, and community contributors.' },
  { emoji: '🎤', title: 'Events & Conferences', desc: 'Instantly dispatch speaker, attendee, and participation certificates.' },
  { emoji: '📋', title: 'Professional Bodies', desc: 'Certify member credentials and continuing-education credits.' },
]

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.webp" alt="Validstep" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/contact" className="text-sm text-gray-600 hover:text-violet-600 transition-colors">Contact</Link>
            <Link to="/auth/company/register"
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-700 transition-colors">
              Get Started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-700 to-indigo-700 text-white py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-6">
            <img src="/logo.webp" alt="Validstep logo" className="h-16 w-auto drop-shadow-lg" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            About Validstep
          </h1>
          <p className="text-violet-200 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
            Certificate infrastructure for modern organisations — issue, manage, and verify digital certificates at scale.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth/company/register"
              className="px-6 py-3 bg-white text-violet-700 font-bold rounded-xl hover:bg-violet-50 transition-colors shadow-lg">
              Start Free Trial
            </Link>
            <Link to="/#features"
              className="px-6 py-3 bg-violet-600/40 border border-violet-400 text-white font-semibold rounded-xl hover:bg-violet-600/60 transition-colors">
              See Features
            </Link>
          </div>
        </div>
      </section>

      {/* What is Validstep */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-3 py-1 bg-violet-100 text-violet-700 text-xs font-bold uppercase tracking-wider rounded-full mb-4">Our Product</span>
            <h2 className="text-3xl font-bold text-gray-900 mb-4 leading-snug">
              The fastest way to issue verifiable digital certificates
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Validstep is a B2B SaaS platform that lets organisations create programs, enrol participants, and issue tamper-proof digital certificates — all from a single dashboard.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Every certificate gets a unique ID and a public QR verification link. Employers, universities, or anyone with the link can verify authenticity instantly — no account, no fee, no friction.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <img src="/greenverify.svg" alt="" className="mt-0.5 flex-shrink-0" style={{ width: 16, height: 16 }} />
                <span className="text-sm text-gray-700 leading-relaxed">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-white border-y border-gray-100 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-full mb-3">Who uses Validstep</span>
            <h2 className="text-3xl font-bold text-gray-900">Built for every organisation that recognises achievement</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map(({ emoji, title, desc }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-violet-200 hover:shadow-sm transition-all">
                <div className="text-3xl mb-3">{emoji}</div>
                <h3 className="font-bold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / Verification highlight */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-8 sm:p-12 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-shrink-0">
            <img src="/greenverify.svg" alt="Verified" style={{ width: 72, height: 72 }} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Instant, public verification — free forever</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              Every certificate issued on Validstep has a permanent public verification URL. Employers, colleges, or background-check agencies can confirm authenticity in seconds — no login, no subscription, no cost. We believe trust should be frictionless.
            </p>
            <Link to="/verify/demo"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors">
              Try Verification <img src="/icon-open-blank.svg" alt="" style={{ width: 14, height: 14, filter: 'invert(1)' }} />
            </Link>
          </div>
        </div>
      </section>

      {/* Parent company */}
      <section className="bg-gray-900 text-gray-300 py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 bg-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider rounded-full mb-3">Built by</span>
            <h2 className="text-2xl font-bold text-white">Bold India Platforms Private Limited</h2>
            <p className="text-gray-500 text-sm mt-1">CIN: U85499PN2025PTC246360 · Incorporated 2025 · Pune, Maharashtra, India</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 text-sm">
            <div className="bg-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Office</span>
              </div>
              <p className="text-gray-300 leading-relaxed">Sn 242/1/2 Baner, Tejaswini Soc,<br />DP Road, N.I.A., Pune,<br />Maharashtra 411045</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Mail className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Email</span>
              </div>
              <a href="mailto:hello@boldindia.in" className="text-violet-400 hover:text-violet-300 transition-colors">hello@boldindia.in</a>
            </div>
            <div className="bg-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <Globe className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Website</span>
              </div>
              <a href="https://www.boldindia.in" target="_blank" rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
                www.boldindia.in <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to modernise your certificates?</h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">Join organisations across India issuing trust-worthy digital credentials on Validstep.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/auth/company/register"
              className="px-8 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-md shadow-violet-200">
              Register Your Organisation
            </Link>
            <Link to="/contact"
              className="px-8 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap gap-4 justify-center text-sm text-gray-500">
          <Link to="/" className="hover:text-violet-600">Home</Link>
          <Link to="/contact" className="hover:text-violet-600">Contact</Link>
          <Link to="/terms" className="hover:text-violet-600">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-violet-600">Privacy Policy</Link>
          <Link to="/refund" className="hover:text-violet-600">Refund Policy</Link>
          <Link to="/delivery" className="hover:text-violet-600">Delivery Policy</Link>
        </div>
      </footer>
    </div>
  )
}
