import { useState, useEffect, useRef } from 'react'
import HeroBg from '../../components/shared/HeroBg'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectUserRole } from '../../store/authSlice'
import {
  Award, Menu, X, ChevronDown, ArrowRight,
  CheckCircle2, Shield, Zap, BarChart3, Globe,
  Building2, Users, FileCheck, QrCode, Mail,
  Lock, Layers, Sparkles, MoveRight,
  Check, TrendingUp, Clock, ExternalLink,
  Search, Upload, AlertCircle, ChevronUp,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────── */
function Navbar() {
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [orgOpen, setOrgOpen]         = useState(false)
  const [verifyOpen, setVerifyOpen]   = useState(false)
  const [scrolled, setScrolled]       = useState(false)
  const [certId, setCertId]           = useState('')
  const [uploadError, setUploadError] = useState(false)

  const dropRef    = useRef(null)
  const verifyRef  = useRef(null)
  const fileRef    = useRef(null)
  const navigate   = useNavigate()

  const isAuthenticated = useSelector(selectIsAuthenticated)
  const role = useSelector(selectUserRole)

  const dashboardPath =
    role === 'COMPANY' ? '/company/dashboard'
    : role === 'SUPERADMIN' ? '/admin/dashboard'
    : '/dashboard'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    const onClick  = (e) => {
      if (dropRef.current   && !dropRef.current.contains(e.target))   setOrgOpen(false)
      if (verifyRef.current && !verifyRef.current.contains(e.target)) { setVerifyOpen(false); setUploadError(false) }
    }
    window.addEventListener('scroll', onScroll)
    document.addEventListener('mousedown', onClick)
    return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('mousedown', onClick) }
  }, [])

  const handleVerify = (e) => {
    e.preventDefault()
    const id = certId.trim()
    if (!id) return
    setVerifyOpen(false)
    setCertId('')
    navigate(`/verify/${id}`)
  }

  const handleUpload = () => {
    fileRef.current?.click()
  }

  const handleFileChange = (e) => {
    if (e.target.files?.length) setUploadError(true)
    e.target.value = ''
  }

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${scrolled ? 'bg-white/98 backdrop-blur shadow-sm border-b border-gray-150' : 'bg-white/80 backdrop-blur'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <img src="/logo.webp" alt="Validstep" className="h-8 w-auto" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[['Features','#features'],['How it Works','#how-it-works'],['Pricing','#pricing']].map(([label, href]) => (
              <a key={label} href={href}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                {label}
              </a>
            ))}
            <Link to="/about"
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              About
            </Link>
            <Link to="/contact"
              className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              Contact
            </Link>

            {/* Employer Verification dropdown */}
            <div className="relative" ref={verifyRef}>
              <button
                onClick={() => { setVerifyOpen(v => !v); setUploadError(false) }}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${verifyOpen ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${verifyOpen ? 'text-emerald-600' : ''}`} />
                Verify Certificate
                <ChevronDown className={`w-3 h-3 transition-transform ${verifyOpen ? 'rotate-180 text-emerald-600' : ''}`} />
              </button>

              {verifyOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 mt-3 w-[520px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">

                  {/* Top banner */}
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">Employer Verification Portal</p>
                      <p className="text-emerald-100 text-xs mt-0.5">Confirm any certificate's authenticity in seconds — no account required</p>
                    </div>
                    <button onClick={() => { setVerifyOpen(false); setUploadError(false) }} className="ml-auto text-white/60 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-6">
                    {/* Search by ID */}
                    <div className="mb-5">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                        Enter Certificate ID
                      </label>
                      <form onSubmit={handleVerify} className="flex gap-2.5">
                        <div className="relative flex-1">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={certId}
                            onChange={e => setCertId(e.target.value)}
                            placeholder="e.g. LIV·2026·08XA"
                            className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent placeholder-gray-300 font-mono bg-gray-50"
                          />
                        </div>
                        <button type="submit"
                          className="px-5 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm shadow-emerald-200">
                          Verify
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </form>
                      <p className="mt-2 text-[11px] text-gray-400">
                        The certificate ID is printed at the top-right of every Validstep certificate (e.g. <span className="font-mono bg-gray-100 px-1 rounded">LIV·2026·08XA</span>)
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-5">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-300 font-medium px-1">or scan certificate file</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    {/* Upload area */}
                    <div className="mb-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                        Upload Certificate PDF or Image
                      </label>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <button
                        type="button"
                        onClick={handleUpload}
                        className="w-full flex items-center gap-4 px-5 py-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/40 transition-all group text-left"
                      >
                        <div className="w-10 h-10 bg-gray-100 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                          <Upload className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-600 group-hover:text-gray-800 transition-colors">Click to upload or drag & drop</p>
                          <p className="text-xs text-gray-400 mt-0.5">PDF or image · Max 10MB</p>
                        </div>
                      </button>
                    </div>

                    {/* Upload error */}
                    {uploadError && (
                      <div className="mt-3 flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3.5">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-600">Unable to detect Certificate ID</p>
                          <p className="text-xs text-red-400 mt-0.5 leading-relaxed">We couldn't extract a valid Validstep ID from this file. Please copy the certificate ID printed on the certificate and enter it manually in the field above.</p>
                        </div>
                      </div>
                    )}

                    {/* Trust strip */}
                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {[
                          { icon: Globe, label: 'No login required' },
                          { icon: Zap, label: 'Instant result' },
                          { icon: Lock, label: 'Free to verify' },
                        ].map(({ icon: Icon, label }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            <Icon className="w-3 h-3 text-emerald-500" />
                            <span className="text-[11px] text-gray-400 font-medium">{label}</span>
                          </div>
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-300 font-medium">Powered by Validstep.com</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <Link to={dashboardPath}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200">
                <BarChart3 className="w-3.5 h-3.5" />
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/auth/user/login"
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                  Sign in
                </Link>

                <div className="relative" ref={dropRef}>
                  <button onClick={() => setOrgOpen(v => !v)}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-sm shadow-violet-200">
                    Get Started
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${orgOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {orgOpen && (
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-50">
                      <p className="px-3 pt-1.5 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Organizations</p>
                      <Link to="/auth/company/register" onClick={() => setOrgOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 rounded-lg transition-colors">
                        <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-3.5 h-3.5 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-[13px]">Register Organization</p>
                          <p className="text-[11px] text-gray-400">Companies, Schools, NGOs</p>
                        </div>
                      </Link>
                      <Link to="/auth/company/login" onClick={() => setOrgOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 rounded-lg transition-colors">
                        <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Lock className="w-3.5 h-3.5 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-[13px]">Organization Login</p>
                          <p className="text-[11px] text-gray-400">Access your dashboard</p>
                        </div>
                      </Link>
                      <div className="my-1.5 border-t border-gray-100" />
                      <p className="px-3 pt-1.5 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Participants</p>
                      <Link to="/auth/user/login" onClick={() => setOrgOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 rounded-lg transition-colors">
                        <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-[13px]">Participant Login</p>
                          <p className="text-[11px] text-gray-400">View your certificates</p>
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1 shadow-lg">
          {[['Features','#features'],['How it Works','#how-it-works'],['Pricing','#pricing']].map(([label, href]) => (
            <a key={label} href={href}
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
              {label}
            </a>
          ))}
          <Link to="/about" onClick={() => setMobileOpen(false)}
            className="block px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
            About
          </Link>
          <Link to="/contact" onClick={() => setMobileOpen(false)}
            className="block px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">
            Contact
          </Link>

          {/* Mobile verify section */}
          <div className="pt-3 border-t border-gray-100 mt-2">
            <p className="px-3 pb-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Verify Certificate</p>
            <form onSubmit={handleVerify} className="flex gap-2 px-1 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={certId}
                  onChange={e => setCertId(e.target.value)}
                  placeholder="Enter Certificate ID"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                />
              </div>
              <button type="submit"
                className="px-3 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          <div className="pt-2 space-y-2 border-t border-gray-100 mt-2">
            {isAuthenticated ? (
              <Link to={dashboardPath} onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-lg text-center">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/auth/company/register" onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-lg text-center">
                  Register Organization
                </Link>
                <Link to="/auth/company/login" onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg text-center hover:bg-gray-50">
                  Organization Login
                </Link>
                <Link to="/auth/user/login" onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-sm font-medium text-violet-600 rounded-lg text-center hover:bg-violet-50">
                  Participant Login
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

/* HeroBg is imported from ../../components/shared/HeroBg */

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function _unused() {
  const canvasRef   = useRef(null)
  const sectionRef  = useRef(null)
  const mouse       = useRef({ x: -9999, y: -9999 })
  const smooth      = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const canvas  = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return
    const ctx = canvas.getContext('2d')
    let raf
    let t = 0

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    /* Track mouse relative to the section element */
    const onMove = (e) => {
      const r = section.getBoundingClientRect()
      mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 } }
    window.addEventListener('mousemove', onMove)
    section.addEventListener('mouseleave', onLeave)

    /* Aurora orbs — large soft drifting blobs */
    const orbs = [
      { bx: 0.78, by: 0.22, r: 0.50, col: [124, 58, 237], sx: 0.06, sy: 0.04, spd: 0.9 },
      { bx: 0.16, by: 0.68, r: 0.42, col: [79,  70, 229], sx: 0.05, sy: 0.07, spd: 0.7 },
      { bx: 0.48, by: 0.50, r: 0.35, col: [168, 85, 247], sx: 0.09, sy: 0.05, spd: 1.1 },
      { bx: 0.88, by: 0.72, r: 0.28, col: [99, 102, 241], sx: 0.04, sy: 0.08, spd: 0.8 },
      { bx: 0.28, by: 0.18, r: 0.26, col: [139, 92, 246], sx: 0.07, sy: 0.04, spd: 1.2 },
    ]

    const draw = () => {
      t += 0.007
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      /* ── aurora orbs ── */
      for (const o of orbs) {
        const x = (o.bx + Math.sin(t * o.spd)       * o.sx) * W
        const y = (o.by + Math.cos(t * o.spd * 0.8) * o.sy) * H
        const r = o.r * Math.min(W, H)
        const [cr, cg, cb] = o.col
        const g = ctx.createRadialGradient(x, y, 0, x, y, r)
        g.addColorStop(0,    `rgba(${cr},${cg},${cb},0.18)`)
        g.addColorStop(0.40, `rgba(${cr},${cg},${cb},0.07)`)
        g.addColorStop(1,    `rgba(${cr},${cg},${cb},0)`)
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = g
        ctx.fill()
      }

      /* ── smooth cursor lerp ── */
      const tx = mouse.current.x
      const ty = mouse.current.y
      const inView = tx > -500
      if (inView) {
        if (smooth.current.x < -500) {
          smooth.current.x = tx
          smooth.current.y = ty
        } else {
          smooth.current.x += (tx - smooth.current.x) * 0.10
          smooth.current.y += (ty - smooth.current.y) * 0.10
        }
      } else {
        smooth.current.x = -9999
        smooth.current.y = -9999
      }
      const mx = smooth.current.x
      const my = smooth.current.y

      if (inView && mx > -200) {
        /* outer halo */
        const halo = ctx.createRadialGradient(mx, my, 0, mx, my, 340)
        halo.addColorStop(0,    'rgba(124,58,237,0.22)')
        halo.addColorStop(0.30, 'rgba(124,58,237,0.10)')
        halo.addColorStop(0.65, 'rgba(99,102,241,0.04)')
        halo.addColorStop(1,    'rgba(99,102,241,0)')
        ctx.beginPath()
        ctx.arc(mx, my, 340, 0, Math.PI * 2)
        ctx.fillStyle = halo
        ctx.fill()

        /* inner bright core */
        const core = ctx.createRadialGradient(mx, my, 0, mx, my, 55)
        core.addColorStop(0,   'rgba(196,167,255,0.55)')
        core.addColorStop(0.5, 'rgba(124,58,237,0.18)')
        core.addColorStop(1,   'rgba(124,58,237,0)')
        ctx.beginPath()
        ctx.arc(mx, my, 55, 0, Math.PI * 2)
        ctx.fillStyle = core
        ctx.fill()

        /* animated ring */
        const ringR = 22 + 6 * Math.sin(t * 4)
        ctx.beginPath()
        ctx.arc(mx, my, ringR, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(167,139,250,${0.45 + 0.2 * Math.sin(t * 3)})`
        ctx.lineWidth = 1.5
        ctx.stroke()

        /* tiny centre dot */
        ctx.beginPath()
        ctx.arc(mx, my, 3, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(196,167,255,0.9)'
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      section.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <div ref={sectionRef} className="absolute inset-0">
      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #c4b5fd 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          opacity: 0.30,
        }} />
      {/* Edge vignette to fade grid into white */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 85% 70% at 50% 50%, transparent 45%, white 100%)' }} />
      {/* Aurora canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </div>
  )
}

/* ─────────────────────────────────────────────
   HERO
───────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center bg-white overflow-hidden">
      <HeroBg />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
              Certificate Infrastructure Platform — built for serious organizations
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-gray-900 leading-[1.1] tracking-tight mb-5">
              Issue. Verify. Trust.
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Certificates that prove themselves.
              </span>
            </h1>

            {/* Sub */}
            <p className="text-lg text-gray-500 leading-relaxed mb-5 max-w-lg">
              Every certificate issued on Validstep.com gets a <strong className="text-gray-700">unique public verification link</strong> — so employers, HRs, and recruiters can confirm authenticity instantly, without calling or emailing the issuing organization.
            </p>

            {/* Ideal for — org types */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">Ideal for</span>
              {['Companies','Startups','Colleges','Schools','NGOs','Training Institutes'].map(type => (
                <span key={type} className="bg-violet-50 border border-violet-100 text-violet-700 text-xs font-medium px-2.5 py-1 rounded-full">
                  {type}
                </span>
              ))}
            </div>

            {/* Employer / HR verification callout */}
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-7 max-w-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-800 leading-snug">
                <span className="font-semibold">Employers · HR teams · Recruiters</span> can verify any certificate via its public link — no login, no calls, no waiting.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-start gap-3 mb-8">
              <Link to="/auth/company/register"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-all shadow-md shadow-violet-200 text-[15px]">
                Start for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#how-it-works"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all text-[15px]">
                See how it works
              </a>
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-5">
              {[
                { val: '55+', label: 'Organizations' },
                { val: '2K+', label: 'Certs issued' },
                { val: '< 1 min', label: 'Verify time' },
              ].map(({ val, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="font-bold text-gray-900">{val}</span>
                  <span className="text-sm text-gray-400">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                No setup fees
              </div>
            </div>

            {/* Verification highlight chips — hidden, moved up */}
            <div className="hidden flex-wrap gap-2 mt-4">
              {[
                { icon: Globe, text: 'Public verification link' },
                { icon: QrCode, text: 'QR code on every cert' },
                { icon: Shield, text: 'Tamper-proof credentials' },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-full">
                  <Icon className="w-3.5 h-3.5 text-violet-500" />
                  {text}
                </span>
              ))}
            </div>
          </div>

          {/* Right — dashboard mockup (light theme) */}
          <div className="relative hidden lg:block">
            <div className="absolute -inset-4 bg-gradient-to-br from-violet-100 to-blue-100 rounded-3xl blur-2xl opacity-50" />
            <div className="relative bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="ml-3 text-xs text-gray-400 font-mono">validstep.com/company/certificates</span>
              </div>

              {/* Dashboard body */}
              <div className="flex">
                {/* Sidebar */}
                <div className="w-36 border-r border-gray-100 p-3 space-y-0.5 bg-gray-50/80 flex-shrink-0">
                  {[
                    { label:'Dashboard',    Icon: BarChart3  },
                    { label:'Programs',     Icon: Layers     },
                    { label:'Certificates', Icon: Award      },
                    { label:'Batches',      Icon: FileCheck  },
                    { label:'Profile',      Icon: Users      },
                  ].map(({ label, Icon }, i) => (
                    <div key={label} className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${i === 2 ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                      <Icon className="w-3 h-3" />
                      {label}
                    </div>
                  ))}
                </div>

                {/* Main */}
                <div className="flex-1 p-4 space-y-3 min-w-0">
                  {/* Stats — cert-only */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label:'Certs Issued',  val:'89',   change:'↑ 12 today', color:'text-violet-600', bg:'bg-violet-50' },
                      { label:'Active Batches', val:'6',   change:'3 programs',  color:'text-blue-600',   bg:'bg-blue-50'   },
                      { label:'Verified Today', val:'34',  change:'via public link', color:'text-emerald-600', bg:'bg-emerald-50' },
                      { label:'Total Programs', val:'12',  change:'All types',   color:'text-indigo-600', bg:'bg-indigo-50' },
                    ].map(({ label, val, change, color, bg }) => (
                      <div key={label} className={`${bg} rounded-xl p-3 border border-white`}>
                        <p className="text-[10px] text-gray-500 mb-1">{label}</p>
                        <p className={`text-base font-bold ${color}`}>{val}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{change}</p>
                      </div>
                    ))}
                  </div>

                  {/* Certificate table */}
                  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700">Recent Certificates</p>
                      <span className="text-[10px] text-violet-600 font-medium">View all</span>
                    </div>
                    {[
                      ['Priya Sharma',  'Web Dev Internship',   'Internship',   'Issued'],
                      ['Rahul Mehta',   'Data Science Course',  'Course',       'Issued'],
                      ['Sneha Patel',   'Frontend Bootcamp',    'Course',       'Issued'],
                      ['Amit Verma',    'UI/UX Hackathon',      'Hackathon',    'Pending'],
                    ].map(([name, program, type, status]) => (
                      <div key={name} className="flex items-center justify-between px-3 py-2 border-b border-gray-50 last:border-0">
                        <span className="text-[11px] font-medium text-gray-800 w-20 truncate">{name}</span>
                        <span className="text-[10px] text-gray-400 flex-1 truncate px-2">{program}</span>
                        <span className="text-[10px] text-indigo-500 font-medium bg-indigo-50 px-1.5 py-0.5 rounded-full">{type}</span>
                        <span className={`text-[10px] font-semibold ml-2 ${status==='Issued' ? 'text-emerald-600' : 'text-amber-500'}`}>
                          {status==='Issued' ? '✓ Issued' : '⏳ Pending'}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Issue button */}
                  <button className="w-full py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5">
                    <Zap className="w-3 h-3" /> Issue Certificates — 8 ready
                  </button>
                </div>
              </div>
            </div>

            {/* Floating badge — verified */}
            <div className="absolute -bottom-4 -left-4 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">34 verifications today</p>
                <p className="text-[11px] text-gray-400">via public certificate links</p>
              </div>
            </div>

            {/* Floating badge — issue time */}
            <div className="absolute -top-4 -right-4 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">89 certs issued</p>
                <p className="text-[11px] text-gray-400">across 6 active batches</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   LOGO STRIP
───────────────────────────────────────────── */
function LogoStrip() {
  const brands = [
    'Tech startups',
    'Training institutes',
    'Colleges',
    'Schools',
    'NGOs',
    'Communities',
  ]

  return (
    <section className="border-y border-gray-100 bg-gray-50/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Trusted by
          </span>
          {brands.map((brand) => (
            <span key={brand} className="text-sm font-semibold text-gray-500">
              {brand}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}


/* ─────────────────────────────────────────────
   FEATURES
───────────────────────────────────────────── */
const FEATURES = [
  { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', title: 'Issue in seconds', desc: 'Select paid orders, click issue — certificates are generated, delivered by email, and publicly verifiable in under a minute.' },
  { icon: QrCode, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', title: 'QR-code on every certificate', desc: 'Each certificate carries a unique QR code that links directly to its public verification page — one scan confirms authenticity, no login needed.' },
  { icon: Globe, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', title: 'Unique public verify link', desc: 'Every certificate gets its own permanent public URL. HRs and employers can verify credentials in seconds — no calls, no emails to the issuing org.' },
  { icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', title: 'Tamper-proof credentials', desc: 'Certificates are cryptographically tied to the issuing organization. Any modification or forgery is instantly detectable on the public page.' },
  { icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', title: 'Multi-program support', desc: 'Internships, fellowships, courses, hackathons — manage unlimited programs and batches under one organization dashboard.' },
  { icon: FileCheck, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-100', title: 'Flexible payment models', desc: 'Organization pays per certificate, or collect fees from participants directly. Both flows are fully automated with invoicing.' },
  { icon: BarChart3, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100', title: 'Full analytics & export', desc: 'Track orders, payment status, issuance rates, and revenue in real time. Export any dataset to Excel with one click.' },
  { icon: Mail, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', title: 'Automated email delivery', desc: 'Certificates reach participant inboxes automatically upon issuance — no manual downloads, no sharing links by hand.' },
]

function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">Platform capabilities</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Built for trust. Designed for speed.
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            From enrollment to public verification — the complete certification workflow in one platform.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(({ icon: Icon, color, bg, border, title, desc }) => (
            <div key={title} className={`group p-6 rounded-2xl border ${border} ${bg} hover:shadow-md transition-all`}>
              <div className={`inline-flex p-2.5 rounded-xl bg-white shadow-sm mb-4 border ${border}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-[15px]">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   VERIFICATION TRUST SECTION
───────────────────────────────────────────── */
function VerificationTrust() {
  return (
    <section className="py-24 bg-gradient-to-b from-violet-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — stat cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 bg-white rounded-2xl border border-violet-100 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6 text-violet-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">One link. Instant proof.</p>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Every certificate issued on our platform gets a <strong className="text-violet-700">unique, permanent public URL</strong>. Share it on a resume, LinkedIn, or email — anyone who clicks it sees real-time verification status directly from our platform.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="font-bold text-gray-900 text-sm mb-1.5">No forgery possible</p>
              <p className="text-xs text-gray-500 leading-relaxed">Certificates are tied to the issuing organization's account. Any tampered copy fails verification instantly.</p>
            </div>

            <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <p className="font-bold text-gray-900 text-sm mb-1.5">QR code on every cert</p>
              <p className="text-xs text-gray-500 leading-relaxed">Printed or digital — the QR code links directly to the live verification page. One scan is all it takes.</p>
            </div>

            <div className="col-span-2 bg-white rounded-2xl border border-amber-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Users className="w-4 h-4 text-amber-600" />
                </div>
                <p className="font-bold text-gray-900 text-sm">Built for HR teams & recruiters</p>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Traditional certificate verification means calling or emailing the issuing company — taking days and consuming valuable HR bandwidth. With Validstep.com, any recruiter or employer can verify a candidate's certificate in under 10 seconds, directly on our platform, with no account needed.
              </p>
            </div>
          </div>

          {/* Right — copy */}
          <div>
            <span className="inline-block bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-5">Why it matters</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-5">
              Authentic credentials,<br />
              <span className="text-violet-600">publicly verifiable</span>
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              Fake certificates are a real problem. Employers and HR teams waste hours contacting organizations to verify credentials — or worse, they can't verify at all and take a risk.
            </p>

            <div className="space-y-5">
              {[
                {
                  icon: Shield,
                  color: 'text-violet-600', bg: 'bg-violet-50',
                  title: 'Maintain original authenticity',
                  desc: 'Every certificate is cryptographically linked to the issuing organization. The public verification page shows the exact details — name, program, dates, issuing org — as issued. Nothing can be altered.',
                },
                {
                  icon: Clock,
                  color: 'text-blue-600', bg: 'bg-blue-50',
                  title: 'Saves HRs hours of back-and-forth',
                  desc: 'No more email chains to verify credentials — HRs confirm authenticity directly via our platform public link. Instant. Reliable. Free to verify.',
                },
                {
                  icon: ExternalLink,
                  color: 'text-emerald-600', bg: 'bg-emerald-50',
                  title: 'Shareable everywhere',
                  desc: 'Participants share their certificate link on LinkedIn, resumes, email signatures, or portfolios. The link is permanent — it never expires.',
                },
              ].map(({ icon: Icon, color, bg, title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm mb-1">{title}</p>
                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-violet-50 border border-violet-200 rounded-xl flex items-center gap-3">
              <Globe className="w-5 h-5 text-violet-600 flex-shrink-0" />
              <p className="text-sm text-violet-700">
                <span className="font-bold">validstep.com/verify/</span><span className="text-violet-500">{'<unique-certificate-id>'}</span> — open to anyone, no login required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   ENTERPRISE TRUST
───────────────────────────────────────────── */
function EnterpriseTrust() {
  const pillars = [
    {
      icon: Shield,
      color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100',
      title: 'Tamper-proof by design',
      desc: 'Every certificate is cryptographically hashed and linked to the issuing organization. Any modification — including AI-generated fakes — is detectable on the public verification page.',
    },
    {
      icon: Lock,
      color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
      title: 'Secure payment processing',
      desc: 'All transactions run through PayU — a PCI-DSS compliant payment gateway trusted by thousands of Indian businesses. We never store card data.',
    },
    {
      icon: Globe,
      color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',
      title: 'Permanently accessible',
      desc: 'Verification links never expire. A certificate issued today remains publicly verifiable years from now — critical for employment background checks and alumni records.',
    },
    {
      icon: TrendingUp,
      color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100',
      title: 'Built to scale',
      desc: 'Issue 10 certificates or 10,000 in a single batch. The platform handles bulk generation, email delivery, and verification load without breaking a sweat.',
    },
  ]

  return (
    <section className="py-24 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">Enterprise-grade infrastructure</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Infrastructure you can build your reputation on
          </h2>
          <p className="mt-4 text-gray-500 text-lg">
            Validstep is not a certificate generator — it is credential infrastructure. Built with the same reliability expectations as payments, identity, and compliance systems.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {pillars.map(({ icon: Icon, color, bg, border, title, desc }) => (
            <div key={title} className={`p-6 rounded-2xl border ${border} ${bg}`}>
              <div className={`inline-flex p-2.5 rounded-xl bg-white shadow-sm mb-4 border ${border}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-[15px]">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Trust bar */}
        <div className="bg-gray-950 rounded-2xl px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-white font-semibold text-sm text-center sm:text-left">
            Designed to sit alongside your organization's brand — not replace it.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {[
              { label: 'Cryptographic verification', dot: 'bg-emerald-400' },
              { label: 'PCI-DSS payments', dot: 'bg-blue-400' },
              { label: 'Permanent public links', dot: 'bg-violet-400' },
              { label: 'Bulk issuance at scale', dot: 'bg-indigo-400' },
            ].map(({ label, dot }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${dot}`} />
                <span className="text-gray-400 text-xs font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   PAYMENT MODELS
───────────────────────────────────────────── */
function PaymentModels() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">Billing flexibility</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Two billing workflows. One platform.
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Whether your program is free or fee-based, Validstep handles the entire issuance pipeline.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Model A */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-blue-200 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Model A</p>
                <h3 className="text-lg font-bold text-gray-900">Organization Pays</h3>
              </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Your organization covers the certificate fee for each participant. Ideal for <span className="font-medium text-gray-700">companies, startups, colleges, schools, NGOs,</span> and any organization running programs where participants should not be charged.
            </p>
            <ul className="space-y-2.5">
              {['Zero friction for participants','Bulk certificate issuance','Company-level invoicing & reporting','Admin controls issuance timing'].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 text-blue-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Model B */}
          <div className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-lg hover:border-violet-200 transition-all relative">
            <div className="absolute top-4 right-4 bg-violet-100 text-violet-700 text-[11px] font-bold px-2.5 py-1 rounded-full">Popular</div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 bg-violet-100 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-violet-600 uppercase tracking-wider">Model B</p>
                <h3 className="text-lg font-bold text-gray-900">Fee-Based Programs</h3>
              </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Running a paid program? Think of this as <span className="font-medium text-gray-700">Stripe + credential issuance in one workflow.</span> Your organization sets the program fee. Participants pay securely. Their credential is issued automatically — zero manual effort on your end.
            </p>
            <ul className="space-y-2.5">
              {['Organization sets the program fee (full control)','Payments via PayU — UPI, cards, netbanking','Credential auto-issued on payment confirmation','Full revenue reporting & per-transaction ledger'].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <div className="w-4 h-4 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 text-violet-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* SaaS billing note */}
        <div className="mt-10 max-w-4xl mx-auto flex items-start gap-3 bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm">
          <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-500 leading-relaxed">
            <span className="font-semibold text-gray-700">Both models are Validstep SaaS billing.</span>{' '}
            Whether your organization absorbs the platform fee or your participants pay it as part of their program — Validstep charges for use of the platform, not for the certificate itself. You stay in full control of your program economics.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   HOW IT WORKS
───────────────────────────────────────────── */
function HowItWorks() {
  const orgSteps = [
    { n:'1', title:'Register your organization', desc:'Create an account. Add your brand name and contact details — ready in 2 minutes.' },
    { n:'2', title:'Create programs & batches', desc:'Set up program types (internship, course, hackathon) and create enrollment batches with dates and pricing.' },
    { n:'3', title:'Share enrollment link', desc:'Each batch gets a unique public link. Share it over email, WhatsApp, or your portal.' },
    { n:'4', title:'Issue with one click', desc:'Once participants complete payment, select all paid orders and issue certificates in bulk. Done.' },
  ]
  const partSteps = [
    { n:'1', title:'Receive enrollment link', desc:'Your organization shares a unique enrollment link for your batch or program.' },
    { n:'2', title:'Enroll & pay', desc:'Fill your details and complete payment (if required) via UPI, card, or netbanking.' },
    { n:'3', title:'Receive your certificate', desc:'Your digital certificate arrives by email and stays accessible on your dashboard — permanently.' },
  ]

  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">Workflow</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">How it works</h2>
          <p className="mt-4 text-gray-500 text-lg">Simple for organizations. Seamless for participants.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Org */}
          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">For Organizations</h3>
            </div>
            <div className="space-y-5">
              {orgSteps.map(({ n, title, desc }, i) => (
                <div key={n} className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{n}</span>
                    </div>
                    {i < orgSteps.length - 1 && <div className="w-0.5 flex-1 bg-violet-200 mt-2 mb-0" style={{minHeight:'24px'}} />}
                  </div>
                  <div className="pb-5">
                    <h4 className="font-semibold text-gray-900 mb-1 text-[15px]">{title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Participant */}
          <div className="bg-blue-50/50 rounded-2xl p-8 border border-blue-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">For Participants</h3>
            </div>
            <div className="space-y-5">
              {partSteps.map(({ n, title, desc }, i) => (
                <div key={n} className="flex gap-4">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{n}</span>
                    </div>
                    {i < partSteps.length - 1 && <div className="w-0.5 flex-1 bg-blue-200 mt-2" style={{minHeight:'24px'}} />}
                  </div>
                  <div className="pb-5">
                    <h4 className="font-semibold text-gray-900 mb-1 text-[15px]">{title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Verification callout */}
            <div className="mt-2 p-4 rounded-xl bg-white border border-blue-100 shadow-sm">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">HRs & employers verify in seconds — not days</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Each certificate has a <span className="font-medium text-gray-700">unique public verification URL</span> and QR code. Recruiters can confirm authenticity instantly — no calls, no emails to the issuing organization, no waiting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   CERTIFICATE TYPES
───────────────────────────────────────────── */
function CertificateTypes() {
  const types = [
    {
      label: 'Internship / Fellowship',
      colorBar: 'bg-blue-500', colorText: 'text-blue-700', colorBg: 'bg-blue-50',
      desc: 'For industry internships and fellowship programs',
      certTitle: 'Internship Completion',
      certName: 'Priya Sharma',
      certProgram: 'Frontend Development Internship',
      certOrg: 'TechCorp Solutions Pvt. Ltd.',
      gradFrom: '#2563eb', gradTo: '#7c3aed',
      accent: '#2563eb', accentBg: '#eff6ff',
    },
    {
      label: 'Course Completion',
      colorBar: 'bg-emerald-500', colorText: 'text-emerald-700', colorBg: 'bg-emerald-50',
      desc: 'Online and offline training courses',
      certTitle: 'Course Completion',
      certName: 'Rahul Mehta',
      certProgram: 'Advanced Data Science · 6 Months',
      certOrg: 'SkillBridge Academy',
      gradFrom: '#059669', gradTo: '#2563eb',
      accent: '#059669', accentBg: '#ecfdf5',
    },
    {
      label: 'Participation',
      colorBar: 'bg-amber-500', colorText: 'text-amber-700', colorBg: 'bg-amber-50',
      desc: 'Events, seminars, and conferences',
      certTitle: 'Participation',
      certName: 'Sneha Patel',
      certProgram: 'National Tech Summit 2026',
      certOrg: 'India Tech Foundation',
      gradFrom: '#d97706', gradTo: '#dc2626',
      accent: '#d97706', accentBg: '#fffbeb',
    },
    {
      label: 'Hackathon',
      colorBar: 'bg-rose-500', colorText: 'text-rose-700', colorBg: 'bg-rose-50',
      desc: 'Coding challenges and innovation sprints',
      certTitle: 'Hackathon Achievement',
      certName: 'Amit Verma',
      certProgram: 'BuildFast Hackathon · 1st Place',
      certOrg: 'DevCircle India',
      gradFrom: '#e11d48', gradTo: '#7c3aed',
      accent: '#e11d48', accentBg: '#fff1f2',
    },
    {
      label: 'Other / Custom',
      colorBar: 'bg-violet-500', colorText: 'text-violet-700', colorBg: 'bg-violet-50',
      desc: 'Any custom certification need',
      certTitle: 'Excellence Award',
      certName: 'Divya Krishnan',
      certProgram: 'Leadership Development Program',
      certOrg: 'Apex Corp Ltd.',
      gradFrom: '#7c3aed', gradTo: '#4f46e5',
      accent: '#7c3aed', accentBg: '#f5f3ff',
    },
  ]

  const [active, setActive] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setActive(i => (i + 1) % types.length)
        setAnimating(false)
      }, 350)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  const t = types[active]

  const QR_PATTERN = [1,1,1,0,1,1,1, 1,0,1,0,1,0,1, 1,0,1,1,1,0,1, 0,1,0,0,0,1,0, 1,1,0,1,0,0,1, 1,0,0,1,0,0,1, 1,1,1,0,1,0,0]

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — text */}
          <div>
            <span className="inline-block bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">Certificate types</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-5">
              One platform,<br />every certificate type
            </h2>
            <p className="text-gray-500 leading-relaxed mb-8">
              Whether you run internship programs, coding bootcamps, or annual conferences — Validstep.com handles all certificate types with the same streamlined workflow.
            </p>
            <div className="space-y-2.5">
              {types.map(({ label, colorBar, colorText, colorBg, desc }, i) => (
                <button
                  key={label}
                  onClick={() => { setAnimating(true); setTimeout(() => { setActive(i); setAnimating(false) }, 250) }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${active === i ? 'bg-white border-gray-200 shadow-md scale-[1.01]' : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'}`}
                >
                  <div className={`w-1.5 h-10 rounded-full flex-shrink-0 transition-all ${colorBar} ${active === i ? 'h-12' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm transition-colors ${active === i ? colorText : 'text-gray-700'}`}>{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${active === i ? colorBg : 'bg-gray-50'}`}>
                    <Check className={`w-3.5 h-3.5 transition-colors ${active === i ? colorText : 'text-gray-300'}`} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right — animated certificate */}
          <div className="relative flex items-center justify-center">
            {/* Ambient glow — changes color with type */}
            <div className="absolute -inset-6 rounded-[40px] blur-[60px] opacity-30 transition-all duration-700"
              style={{ background: `linear-gradient(135deg, ${t.gradFrom}55, ${t.gradTo}55)` }} />

            <div className="relative w-full max-w-[400px]">

              {/* Shadow cards */}
              <div className="absolute inset-0 translate-y-5 translate-x-3 rounded-3xl opacity-40 transition-all duration-700"
                style={{ background: t.gradTo + '33', border: `1px solid ${t.gradTo}22` }} />
              <div className="absolute inset-0 translate-y-2.5 translate-x-1.5 rounded-3xl opacity-60 transition-all duration-700"
                style={{ background: t.gradFrom + '22', border: `1px solid ${t.gradFrom}22` }} />

              {/* Main card */}
              <div
                className="relative bg-white rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.15)]"
                style={{ animation: 'certFloat 4s ease-in-out infinite', transition: 'box-shadow 0.5s ease' }}
              >
                {/* Top shimmer bar */}
                <div className="h-2 relative overflow-hidden transition-all duration-700"
                  style={{ background: `linear-gradient(90deg, ${t.gradFrom}, ${t.gradTo})` }}>
                  <div className="absolute inset-0 opacity-60"
                    style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)', animation: 'shimmer 2s linear infinite' }} />
                </div>

                {/* Corner dots decoration */}
                <div className="absolute top-2 left-0 w-24 h-24 opacity-[0.035]"
                  style={{ backgroundImage: `radial-gradient(circle, ${t.gradFrom} 1.5px, transparent 1.5px)`, backgroundSize: '9px 9px' }} />
                <div className="absolute top-2 right-0 w-24 h-24 opacity-[0.035]"
                  style={{ backgroundImage: `radial-gradient(circle, ${t.gradTo} 1.5px, transparent 1.5px)`, backgroundSize: '9px 9px' }} />

                <div
                  className="transition-all duration-300"
                  style={{ opacity: animating ? 0 : 1, transform: animating ? 'translateY(8px)' : 'translateY(0)' }}
                >
                  <div className="px-8 pt-7 pb-7">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-all duration-700"
                          style={{ background: `linear-gradient(135deg, ${t.gradFrom}, ${t.gradTo})` }}>
                          <Award className="w-4.5 h-4.5 text-white w-[18px] h-[18px]" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest transition-colors duration-500" style={{ color: t.accent }}>{t.certOrg.split(' ').slice(0,2).join(' ')}</p>
                          <p className="text-[9px] text-gray-400">Powered by Validstep.com</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-gray-400 uppercase tracking-wider mb-0.5">Cert ID</p>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border transition-all duration-500"
                          style={{ color: t.accent, background: t.accentBg, borderColor: t.accent + '33' }}>
                          LIV·2026·08XA
                        </span>
                      </div>
                    </div>

                    {/* Ornamental rule with stars */}
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="flex-1 h-px transition-all duration-700" style={{ background: `linear-gradient(90deg, transparent, ${t.gradFrom}55)` }} />
                      <div className="flex gap-1">
                        {[...Array(3)].map((_, i) => (
                          <svg key={i} className="w-2 h-2 transition-colors duration-700" style={{ fill: t.accent }} viewBox="0 0 24 24">
                            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                          </svg>
                        ))}
                      </div>
                      <div className="flex-1 h-px transition-all duration-700" style={{ background: `linear-gradient(90deg, ${t.gradTo}55, transparent)` }} />
                    </div>

                    {/* Certificate type label */}
                    <div className="text-center mb-5">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gray-400 mb-2">This certifies that</p>

                      {/* Recipient name */}
                      <p className="text-2xl font-black text-gray-900 tracking-tight mb-0.5">{t.certName}</p>
                      <div className="w-16 h-0.5 mx-auto rounded-full mb-3 transition-all duration-700"
                        style={{ background: `linear-gradient(90deg, ${t.gradFrom}, ${t.gradTo})` }} />

                      <p className="text-[10px] text-gray-400 mb-1.5">has successfully completed</p>
                      <p className="text-[15px] font-bold transition-colors duration-500" style={{ color: t.accent }}>{t.certTitle}</p>
                      <p className="text-[11px] text-gray-500 mt-1">{t.certProgram}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{t.certOrg}</p>
                    </div>

                    {/* Details pills */}
                    <div className="flex justify-center gap-2 mb-5">
                      {['April 2026', 'Batch 2026', 'Distinction'].map((val, i) => (
                        <span key={val} className="text-[9px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-700"
                          style={{ color: t.accent, background: t.accentBg, borderColor: t.accent + '30' }}>
                          {val}
                        </span>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-end pt-4 border-t border-gray-100">
                      <div>
                        {/* Stylized signature */}
                        <svg width="68" height="22" viewBox="0 0 68 22" className="mb-1 opacity-60 transition-all duration-700">
                          <path d={`M2 17 Q10 4 18 11 Q26 18 34 7 Q42 -1 50 9 Q57 17 66 13`}
                            stroke={t.accent} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <div className="w-20 h-px bg-gray-200 mb-1" />
                        <p className="text-[9px] text-gray-400">Authorized Signatory</p>
                        <p className="text-[10px] font-bold text-gray-600">{t.certOrg.split(' ').slice(0,2).join(' ')}</p>
                      </div>

                      {/* QR */}
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-14 h-14 rounded-xl p-1.5 border-2 transition-all duration-700 shadow-sm"
                          style={{ borderColor: t.accent + '33', background: t.accentBg }}>
                          <div className="w-full h-full grid grid-cols-7 gap-[1.5px]">
                            {QR_PATTERN.map((v, i) => (
                              <div key={i} className="rounded-[1px] transition-colors duration-700"
                                style={{ background: v ? t.accent : 'transparent' }} />
                            ))}
                          </div>
                        </div>
                        <p className="text-[9px] font-medium text-gray-400">Scan to verify</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom bar */}
                <div className="h-2 transition-all duration-700"
                  style={{ background: `linear-gradient(90deg, ${t.gradTo}, ${t.gradFrom})` }} />

                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                  <p className="text-[72px] font-black uppercase tracking-widest select-none rotate-[-22deg] transition-colors duration-700"
                    style={{ color: t.gradFrom + '08' }}>VALID</p>
                </div>
              </div>

              {/* Verified badge — outside overflow-hidden card */}
              <div className="absolute -top-3 -right-3 flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/25 z-10">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </div>

              {/* Type indicator dots */}
              <div className="mt-5 flex items-center justify-center gap-2">
                {types.map((_, i) => (
                  <button key={i} onClick={() => { setAnimating(true); setTimeout(() => { setActive(i); setAnimating(false) }, 250) }}
                    className="rounded-full transition-all duration-500"
                    style={{
                      width: active === i ? '20px' : '6px',
                      height: '6px',
                      background: active === i ? types[i].accent : '#d1d5db',
                    }}
                  />
                ))}
              </div>
              <p className="text-center text-xs text-gray-400 mt-2">
                Auto-cycling · Click any type to preview
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   OLD WAY vs VALIDSTEP
───────────────────────────────────────────── */
function OldWayVsNew() {
  const rows = [
    {
      before: 'Design certificates manually for every batch',
      after:  'Bulk-generate and issue in under a minute',
    },
    {
      before: 'Email PDFs one by one to each participant',
      after:  'Certificates auto-delivered to participant inboxes',
    },
    {
      before: 'Employers call or email to verify — wait days',
      after:  'Employers verify via public link — instantly, no login',
    },
    {
      before: 'No way to detect forged or tampered certificates',
      after:  'Cryptographic tamper detection on every certificate',
    },
    {
      before: 'Track enrollment on spreadsheets',
      after:  'Built-in enrollment management & payment collection',
    },
    {
      before: 'Zero visibility into who viewed or verified a cert',
      after:  'Real-time dashboard: verifications, orders, revenue',
    },
  ]

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-72 bg-violet-50 blur-[100px] rounded-full pointer-events-none" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="inline-block bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">The difference</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            Before Validstep. After Validstep.
          </h2>
          <p className="mt-4 text-gray-500 text-lg">
            See how organizations move from manual chaos to automated clarity.
          </p>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_40px_1fr] gap-0 mb-3 px-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-100 rounded-md flex items-center justify-center">
              <X className="w-3 h-3 text-red-500" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Without Validstep</span>
          </div>
          <div />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-100 rounded-md flex items-center justify-center">
              <Check className="w-3 h-3 text-emerald-600" />
            </div>
            <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">With Validstep</span>
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {rows.map(({ before, after }, i) => (
            <div key={i} className="grid grid-cols-[1fr_40px_1fr] items-stretch gap-0 rounded-xl overflow-hidden border border-gray-100 hover:border-violet-100 hover:shadow-sm transition-all">
              {/* Before cell */}
              <div className="flex items-center gap-3 bg-gray-50 px-5 py-4">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <X className="w-2.5 h-2.5 text-red-400" />
                </div>
                <p className="text-sm text-gray-400 leading-snug line-through decoration-red-200">{before}</p>
              </div>

              {/* Arrow divider */}
              <div className="flex items-center justify-center bg-white border-x border-gray-100">
                <ArrowRight className="w-3.5 h-3.5 text-violet-300" />
              </div>

              {/* After cell */}
              <div className="flex items-center gap-3 bg-violet-50/60 px-5 py-4">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                </div>
                <p className="text-sm text-gray-800 font-medium leading-snug">{after}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   TESTIMONIALS
───────────────────────────────────────────── */
function Testimonials() {
  const reviews = [
    {
      quote: "We used to spend an entire day designing and emailing certificates after each internship batch. With Validstep, we issue 40 certificates in two minutes — and our interns love sharing the public link on LinkedIn.",
      name: "Rohan Kapoor",
      role: "Operations Head",
      org: "EdTech Startup",
      initials: "RK",
      color: "from-violet-500 to-indigo-500",
    },
    {
      quote: "As a college coordinator, the verification link has been a game-changer. Employers no longer call us to validate certificates — they just click the link. Our placement rate improved because HRs trust Validstep credentials.",
      name: "Dr. Meera Iyer",
      role: "Placement Coordinator",
      org: "Engineering College",
      initials: "MI",
      color: "from-blue-500 to-cyan-500",
    },
    {
      quote: "The participant-pays model let us launch our certification program with zero upfront cost. Students pay directly, certificates issue automatically, and I get a full revenue dashboard. It practically runs itself.",
      name: "Arjun Nair",
      role: "Founder",
      org: "Training Institute",
      initials: "AN",
      color: "from-emerald-500 to-teal-500",
    },
  ]

  return (
    <section className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">Trusted by organizations</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            What organizations say
          </h2>
          <p className="mt-4 text-gray-500 text-lg">
            From colleges to startups — teams across India trust Validstep.com.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map(({ quote, name, role, org, initials, color }) => (
            <div key={name} className="bg-white border border-gray-100 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="flex gap-1 mb-5">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-4 h-4 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed flex-1 mb-6">"{quote}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs font-bold">{initials}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{name}</p>
                  <p className="text-xs text-gray-400">{role} · {org}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   FAQ
───────────────────────────────────────────── */
function FAQ() {
  const [openIdx, setOpenIdx] = useState(null)

  const faqs = [
    {
      q: "How does public certificate verification work?",
      a: "Every certificate issued on Validstep.com gets a unique permanent URL (e.g. validstep.com/verify/abc123). Anyone — an employer, HR, or recruiter — can open that link without logging in and see the verified certificate details in real time, directly from our platform.",
    },
    {
      q: "Can participants share their certificates on LinkedIn or resumes?",
      a: "Yes. Participants receive their certificate link by email and can access it anytime from their dashboard. The public verification URL can be added to LinkedIn profiles, resumes, portfolios, or email signatures. The link never expires.",
    },
    {
      q: "What happens if a certificate is forged or tampered?",
      a: "Certificates are cryptographically tied to the issuing organization's account. If someone modifies a PDF or creates a fake, the public verification page will show it as invalid or not found — instantly detectable by any employer.",
    },
    {
      q: "Which payment methods do participants use?",
      a: "Participant payments are processed via PayU — supporting UPI, debit/credit cards, net banking, and wallets. Certificates are issued automatically on payment confirmation, with no manual steps needed from the organization.",
    },
    {
      q: "Can we issue certificates without charging participants?",
      a: "Absolutely. In the Organization Pays model, your organization covers the certificate fee. Participants enroll via a shared link and receive their certificates free of charge — ideal for colleges, NGOs, and internal training programs.",
    },
    {
      q: "Is there a limit on programs or certificates we can issue?",
      a: "No hard limits. You can create unlimited programs, batches, and certificates under your organization dashboard. Pricing is based on your use case and volume — contact us for organizational rates.",
    },
  ]

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-12 items-start">
          <div className="lg:sticky lg:top-24">
            <span className="inline-block bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">FAQ</span>
            <h2 className="text-3xl font-bold text-gray-900 leading-tight mb-4">
              Questions we get a lot
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Everything you need to know about issuing and verifying certificates on Validstep.com.
            </p>
            <Link to="/auth/company/register"
              className="inline-flex items-center gap-2 mt-8 px-5 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 transition-all shadow-sm shadow-violet-200 text-sm">
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {faqs.map(({ q, a }, i) => (
              <div key={q} className={`bg-white rounded-xl border transition-all ${openIdx === i ? 'border-violet-200 shadow-sm' : 'border-gray-100'}`}>
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left gap-4"
                >
                  <span className={`font-semibold text-sm leading-snug ${openIdx === i ? 'text-violet-700' : 'text-gray-900'}`}>{q}</span>
                  <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${openIdx === i ? 'rotate-180 text-violet-600' : 'text-gray-400'}`} />
                </button>
                {openIdx === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-gray-500 leading-relaxed">{a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   PRICING
───────────────────────────────────────────── */
function Pricing() {
  const plans = [
    { type: 'Internship / Fellowship', icon: '🎓', color: 'border-blue-200 bg-blue-50/40', labelColor: 'text-blue-700', badge: '' },
    { type: 'Course Completion', icon: '📘', color: 'border-violet-300 bg-white ring-2 ring-violet-200 shadow-lg', labelColor: 'text-violet-700', badge: 'Most popular' },
    { type: 'Participation / Other', icon: '🏅', color: 'border-gray-200 bg-gray-50/40', labelColor: 'text-gray-700', badge: '' },
  ]
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">Pricing</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Flexible organizational pricing</h2>
          <p className="mt-4 text-gray-500 text-lg">
            Plans are tailored by program scale and organization needs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map(({ type, icon, color, labelColor, badge }) => (
            <div key={type} className={`rounded-2xl border p-7 relative transition-all hover:shadow-md ${color}`}>
              {badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  {badge}
                </span>
              )}
              <div className="text-3xl mb-5">{icon}</div>
              <p className={`font-bold text-sm mb-2 ${labelColor}`}>{type}</p>
              <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5">
                <p className="text-sm font-semibold text-violet-700">Contact for organizational pricing</p>
              </div>
              <div className="border-t border-gray-200 pt-5">
                <p className="text-xs text-gray-500">Both payment models supported. Pricing is finalized based on your use case.</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          Contact our team for organizational pricing and enterprise onboarding.
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   CUSTOM CERTIFICATE DESIGN
───────────────────────────────────────────── */
function CustomDesign() {
  const features = [
    {
      icon: Sparkles,
      color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100',
      title: 'Bespoke design for your brand',
      desc: 'Our design team crafts certificates that carry your logo, brand colors, typography, and signature layout — indistinguishable from a premium printed credential.',
    },
    {
      icon: Layers,
      color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
      title: 'Bulk production at scale',
      desc: 'Whether it\'s 50 or 50,000 — once your template is approved, we generate the entire batch in one run. Every name, date, and program filled automatically.',
    },
    {
      icon: QrCode,
      color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',
      title: 'Verification built in, by design',
      desc: 'Every custom certificate includes a Validstep QR code and public verification URL — embedded naturally into the design, not slapped on as an afterthought.',
    },
    {
      icon: Zap,
      color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100',
      title: 'Fast turnaround',
      desc: 'Template approved in 24–48 hrs. Full batch issued on your timeline. No waiting weeks for a designer or a printing vendor.',
    },
  ]

  const types = ['Internship & Fellowship', 'Course Completion', 'Hackathon & Competitions', 'Seminars & Conferences', 'Corporate Training', 'Academic Achievement']

  return (
    <section className="py-24 bg-gray-950 relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <span className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-6">
              <Sparkles className="w-3 h-3" />
              Premium design service
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-5">
              We design your certificates.<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                You issue them in bulk.
              </span>
            </h2>
            <p className="text-gray-400 leading-relaxed mb-8 text-lg">
              We're experts at producing <strong className="text-gray-200">custom-branded, professionally designed</strong> certificates at scale — combined with Validstep's instant public verification infrastructure.
            </p>

            {/* Feature list */}
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {features.map(({ icon: Icon, color, bg, border, title, desc }) => (
                <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-all">
                  <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="font-semibold text-white text-sm mb-1">{title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* Certificate types we cover */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">We cover all types</p>
              <div className="flex flex-wrap gap-2">
                {types.map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 text-gray-300 text-xs font-medium px-3 py-1.5 rounded-full">
                    <Check className="w-3 h-3 text-violet-400" />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — animated certificate canvas */}
          <div className="relative flex items-center justify-center lg:justify-end">
            {/* Ambient glow */}
            <div className="absolute -inset-8 bg-gradient-to-br from-violet-600/25 via-purple-600/15 to-indigo-600/25 blur-[80px] rounded-[40px]" />

            <div className="relative w-full max-w-[420px]">

              {/* Stacked shadow cards */}
              <div className="absolute inset-0 translate-y-8 translate-x-5 bg-indigo-800/40 border border-indigo-600/20 rounded-3xl blur-sm" />
              <div className="absolute inset-0 translate-y-4 translate-x-2.5 bg-violet-800/50 border border-violet-600/30 rounded-3xl" />

              {/* Main certificate card */}
              <div
                className="relative bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden"
                style={{ animation: 'certFloat 4s ease-in-out infinite' }}
              >
                {/* Top gradient bar */}
                <div className="h-2 bg-gradient-to-r from-violet-600 via-purple-500 to-indigo-500" />

                {/* Decorative corner pattern */}
                <div className="absolute top-2 left-0 w-28 h-28 opacity-[0.04]"
                  style={{ backgroundImage: 'radial-gradient(circle, #7c3aed 1.5px, transparent 1.5px)', backgroundSize: '10px 10px' }} />
                <div className="absolute top-2 right-0 w-28 h-28 opacity-[0.04]"
                  style={{ backgroundImage: 'radial-gradient(circle, #4f46e5 1.5px, transparent 1.5px)', backgroundSize: '10px 10px' }} />

                <div className="px-8 pt-7 pb-7">

                  {/* Header row */}
                  <div className="flex items-center justify-between mb-7">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-300">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-violet-700 uppercase tracking-widest">TechCorp Solutions</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Powered by Validstep.com</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-gray-400 mb-0.5">Certificate ID</p>
                      <span className="text-[10px] text-violet-600 font-mono font-bold bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-md">LIV·2026·08XA</span>
                    </div>
                  </div>

                  {/* Decorative divider with stars */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-200 to-transparent" />
                    <div className="flex items-center gap-1">
                      {[...Array(3)].map((_, i) => (
                        <svg key={i} className="w-2.5 h-2.5 fill-violet-400" viewBox="0 0 24 24">
                          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                        </svg>
                      ))}
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-200 to-transparent" />
                  </div>

                  {/* Certificate of */}
                  <div className="text-center mb-5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.25em] mb-2">This is to certify that</p>

                    {/* Recipient name with animated underline */}
                    <div className="relative inline-block mb-1">
                      <p className="text-2xl font-black text-gray-900 tracking-tight">Priya Sharma</p>
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                        style={{ animation: 'expandWidth 2s ease-out forwards' }} />
                    </div>

                    <p className="text-[11px] text-gray-400 mt-3 mb-1">has successfully completed</p>
                    <p className="text-base font-bold text-violet-700">Frontend Development Internship</p>
                    <p className="text-[11px] text-gray-400 mt-1">at TechCorp Solutions Pvt. Ltd.</p>
                  </div>

                  {/* Details row */}
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {[
                      { label: 'Duration', value: '3 Months' },
                      { label: 'Batch', value: '2026' },
                      { label: 'Grade', value: 'Excellent' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-center">
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                        <p className="text-[11px] font-bold text-gray-700">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Footer — signature + QR */}
                  <div className="flex justify-between items-end pt-5 border-t border-gray-100">
                    <div>
                      {/* Signature scribble simulation */}
                      <svg width="72" height="24" viewBox="0 0 72 24" className="mb-1 opacity-70">
                        <path d="M2 18 Q12 4 20 12 Q28 20 36 8 Q44 -2 52 10 Q58 18 70 14" stroke="#7c3aed" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <div className="w-24 h-px bg-gray-200 mb-1" />
                      <p className="text-[9px] text-gray-400">Authorized Signatory</p>
                      <p className="text-[10px] font-bold text-gray-600">TechCorp Solutions</p>
                    </div>

                    {/* QR code */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-14 h-14 bg-white border-2 border-gray-100 rounded-xl p-1.5 shadow-sm">
                        <div className="w-full h-full grid grid-cols-7 gap-[1.5px]">
                          {[1,1,1,0,1,1,1, 1,0,1,0,1,0,1, 1,0,1,1,1,0,1, 0,0,0,1,0,0,0, 1,0,1,0,0,1,1, 1,0,0,1,0,0,1, 1,1,1,0,1,0,0].map((v,i) => (
                            <div key={i} className={`rounded-[1px] ${v ? 'bg-gray-900' : 'bg-transparent'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-400 font-medium">Scan to verify</p>
                    </div>
                  </div>
                </div>

                {/* Bottom gradient bar */}
                <div className="h-2 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-600" />

                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-[80px] font-black text-gray-900/[0.025] uppercase tracking-widest select-none rotate-[-20deg]">VALID</p>
                </div>
              </div>

              {/* Verified floating badge — outside overflow-hidden card */}
              <div className="absolute -top-3 -right-3 flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/30 z-10"
                style={{ animation: 'badgePop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both' }}>
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </div>

              {/* Floating info chips */}
              <div className="absolute -left-5 top-1/3 bg-white border border-gray-100 rounded-2xl shadow-lg px-3.5 py-2.5 flex items-center gap-2.5"
                style={{ animation: 'chipFloat 3s ease-in-out infinite 0.5s' }}>
                <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-800">Custom branded</p>
                  <p className="text-[9px] text-gray-400">Your logo & colors</p>
                </div>
              </div>

              <div className="absolute -right-5 bottom-1/3 bg-white border border-gray-100 rounded-2xl shadow-lg px-3.5 py-2.5 flex items-center gap-2.5"
                style={{ animation: 'chipFloat 3s ease-in-out infinite 1.2s' }}>
                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-800">Bulk ready</p>
                  <p className="text-[9px] text-gray-400">1 to 50,000+</p>
                </div>
              </div>

              {/* Label below */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-xs text-gray-500">Custom designed · Your brand · Bulk ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   CTA
───────────────────────────────────────────── */
function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800" />
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.12]"
        style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-white/10 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
          Give your certificates<br />the credibility they deserve
        </h2>
        <p className="text-violet-200 text-lg mb-4 max-w-xl mx-auto">
          Stop issuing certificates that no one can verify. Every certificate on Validstep.com comes with a permanent public link — so employers and HRs can confirm authenticity in seconds.
        </p>
        <p className="text-violet-300 text-sm mb-10">
          Companies · Startups · Colleges · Schools · NGOs · Training Institutes
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/auth/company/register"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white text-violet-700 font-bold rounded-xl hover:bg-violet-50 transition-all shadow-lg text-[15px]">
            Register your organization
            <MoveRight className="w-4 h-4" />
          </Link>
          <Link to="/auth/user/login"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white/10 border border-white/20 text-white font-medium rounded-xl hover:bg-white/20 transition-all text-[15px]">
            Participant login
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────── */
function Footer() {
  const cols = [
    { heading: 'Platform', links: [{ label:'Features', href:'#features' },{ label:'How it Works', href:'#how-it-works' },{ label:'Pricing', href:'#pricing' }] },
    { heading: 'Organizations', links: [{ label:'Register', to:'/auth/company/register' },{ label:'Login', to:'/auth/company/login' }] },
    { heading: 'Participants', links: [{ label:'Login', to:'/auth/user/login' },{ label:'Register', to:'/auth/user/register' },{ label:'Verify Certificate', to:'/verify/demo' }] },
    { heading: 'Company', links: [{ label:'About', to:'/about' },{ label:'Contact', to:'/contact' }] },
    { heading: 'Legal', links: [{ label:'Terms & Conditions', to:'/terms' },{ label:'Privacy Policy', to:'/privacy' },{ label:'Refund Policy', to:'/refund' },{ label:'Delivery Policy', to:'/delivery' }] },
  ]

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.webp" alt="Validstep" className="h-8 w-auto" />
            </div>
            <p className="text-xs leading-relaxed text-gray-500">
              Certificate infrastructure for modern organizations. Issue, manage, and verify digital certificates at scale.
            </p>
          </div>

          {cols.map(({ heading, links }) => (
            <div key={heading}>
              <p className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-4">{heading}</p>
              <ul className="space-y-2.5">
                {links.map(({ label, to, href }) => (
                  <li key={label}>
                    {to
                      ? <Link to={to} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">{label}</Link>
                      : <a href={href} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">{label}</a>
                    }
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
            <div>
              <p className="text-gray-500 font-semibold mb-1">Parent Legal Company</p>
              <p>Bold India Platforms Private Limited</p>
              <p>CIN: U85499PN2025PTC246360</p>
              <p>Incorporated 2025 · Pune, Maharashtra, India</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold mb-1">Office Address</p>
              <p>Sn 242/1/2 Baner, Tejaswini Soc,</p>
              <p>DP Road, N.I.A., Pune,</p>
              <p>Maharashtra 411045</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold mb-1">Contact</p>
              <p>Email: <a href="mailto:hello@boldindia.in" className="hover:text-gray-400 transition-colors">hello@boldindia.in</a></p>
              <p>Web: <a href="https://www.boldindia.in" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">www.boldindia.in</a></p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} Validstep.com. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>Digital certificates only — no physical delivery</span>
              <span>·</span>
              <Link to="/auth/admin/login" className="hover:text-gray-400 transition-colors">Admin</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────────────────────────────────
   BACK TO TOP
───────────────────────────────────────────── */
function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 pl-3 pr-4 py-2.5 bg-gray-900 text-white text-xs font-semibold rounded-full shadow-lg hover:bg-violet-600 transition-all duration-300 group ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
    >
      <div className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
        <ChevronUp className="w-3 h-3" />
      </div>
      Back to top
    </button>
  )
}

/* ─────────────────────────────────────────────
   PAGE
───────────────────────────────────────────── */
export default function Home() {
  return (
    <div className="min-h-screen font-sans antialiased bg-white">
      <Navbar />
      <Hero />
      <LogoStrip />
      <Features />
      <VerificationTrust />
      <OldWayVsNew />
      <EnterpriseTrust />
      <PaymentModels />
      <HowItWorks />
      <CertificateTypes />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CustomDesign />
      <CTA />
      <Footer />
      <BackToTop />
    </div>
  )
}
