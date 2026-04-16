import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectUserRole } from '../../store/authSlice'
import {
  Award, Menu, X, ChevronDown, ArrowRight,
  CheckCircle2, Shield, Zap, BarChart3, Globe,
  Building2, Users, FileCheck, QrCode, Mail,
  Lock, Layers, Sparkles, MoveRight,
  Check, TrendingUp, Clock, ExternalLink,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────── */
function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [orgOpen, setOrgOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropRef = useRef(null)

  const isAuthenticated = useSelector(selectIsAuthenticated)
  const role = useSelector(selectUserRole)

  const dashboardPath =
    role === 'COMPANY' ? '/company/dashboard'
    : role === 'SUPERADMIN' ? '/admin/dashboard'
    : '/dashboard'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    const onClick  = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOrgOpen(false) }
    window.addEventListener('scroll', onScroll)
    document.addEventListener('mousedown', onClick)
    return () => { window.removeEventListener('scroll', onScroll); document.removeEventListener('mousedown', onClick) }
  }, [])

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-200 ${scrolled ? 'bg-white/98 backdrop-blur shadow-sm border-b border-gray-150' : 'bg-white/80 backdrop-blur'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shadow-sm">
              <Award className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-[15px] tracking-tight">
              ListedIndia <span className="text-violet-600">Verify</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[['Features','#features'],['How it Works','#how-it-works'],['Pricing','#pricing']].map(([label, href]) => (
              <a key={label} href={href}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                {label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              /* Already logged in — show dashboard shortcut */
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
          <div className="pt-3 space-y-2 border-t border-gray-100 mt-2">
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

/* ─────────────────────────────────────────────
   HERO BACKGROUND — PARTICLE NETWORK
───────────────────────────────────────────── */
function HeroBg() {
  const canvasRef = useRef(null)
  const mouse = useRef({ x: -9999, y: -9999 })
  const tick  = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect()
      mouse.current = { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 } }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)

    /* ── palette ── */
    const PALETTE = [
      [124, 58, 237],   // violet-600
      [79,  70, 229],   // indigo-600
      [37,  99, 235],   // blue-600
      [168, 85, 247],   // purple-500
      [99, 102, 241],   // indigo-500
    ]
    const COUNT       = 90
    const LINK_DIST   = 160
    const ATTRACT_R   = 160   // mouse attracts within this radius
    const REPEL_R     = 80    // mouse repels within this tighter radius
    const ATTRACT_STR = 0.08
    const REPEL_STR   = 0.22

    const particles = Array.from({ length: COUNT }, () => {
      const col = PALETTE[Math.floor(Math.random() * PALETTE.length)]
      return {
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r:  Math.random() * 2.2 + 0.8,
        col,
        base: Math.random() * 0.3 + 0.12,
        phase: Math.random() * Math.PI * 2,   // for pulse
        speed: 0.6 + Math.random() * 0.8,     // individual speed multiplier
      }
    })

    const draw = () => {
      tick.current++
      const t  = tick.current
      const W  = canvas.width
      const H  = canvas.height
      const mx = mouse.current.x
      const my = mouse.current.y

      ctx.clearRect(0, 0, W, H)

      /* ── update positions ── */
      for (const p of particles) {
        const dx   = p.x - mx
        const dy   = p.y - my
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < REPEL_R && dist > 0.1) {
          /* hard repulsion close to cursor */
          const f = ((REPEL_R - dist) / REPEL_R) ** 1.5
          p.vx += (dx / dist) * f * REPEL_STR
          p.vy += (dy / dist) * f * REPEL_STR
        } else if (dist < ATTRACT_R && dist > REPEL_R) {
          /* gentle pull toward cursor outside repel zone */
          const f = ((ATTRACT_R - dist) / (ATTRACT_R - REPEL_R)) * ATTRACT_STR
          p.vx -= (dx / dist) * f
          p.vy -= (dy / dist) * f
        }

        /* dampen */
        p.vx *= 0.985
        p.vy *= 0.985

        /* nudge particles gently so they never fully stop */
        if (Math.abs(p.vx) < 0.1) p.vx += (Math.random() - 0.5) * 0.04
        if (Math.abs(p.vy) < 0.1) p.vy += (Math.random() - 0.5) * 0.04

        p.x += p.vx * p.speed
        p.y += p.vy * p.speed

        /* wrap */
        if (p.x < -20)    p.x = W + 20
        if (p.x > W + 20) p.x = -20
        if (p.y < -20)    p.y = H + 20
        if (p.y > H + 20) p.y = -20
      }

      /* ── draw connections ── */
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a  = particles[i], b = particles[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const d  = Math.sqrt(dx * dx + dy * dy)
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.22
            const [r, g, bl] = a.col
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(${r},${g},${bl},${alpha})`
            ctx.lineWidth = 0.9
            ctx.stroke()
          }
        }
      }

      /* ── draw dots with pulse ── */
      for (const p of particles) {
        /* pulse opacity with sin wave */
        const pulse   = 0.5 + 0.5 * Math.sin(t * 0.025 + p.phase)
        const opacity = p.base * (0.6 + 0.4 * pulse)
        /* radius breathes slightly */
        const radius  = p.r * (0.85 + 0.2 * pulse)

        const [r, g, b] = p.col
        /* glow halo */
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3.5)
        grad.addColorStop(0, `rgba(${r},${g},${b},${opacity * 0.9})`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius * 3.5, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        /* solid core */
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(opacity * 1.4, 0.7)})`
        ctx.fill()
      }

      /* ── cursor glow ── */
      if (mx > 0 && my > 0) {
        const cg = ctx.createRadialGradient(mx, my, 0, mx, my, 120)
        cg.addColorStop(0, 'rgba(124,58,237,0.07)')
        cg.addColorStop(1, 'rgba(124,58,237,0)')
        ctx.beginPath()
        ctx.arc(mx, my, 120, 0, Math.PI * 2)
        ctx.fillStyle = cg
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <>
      {/* Ambient gradient wash */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 75% 55% at 75% 35%, #ede9fe60 0%, transparent 65%)' }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 50% at 15% 75%, #dbeafe50 0%, transparent 65%)' }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 40% 40% at 50% 50%, #f3e8ff30 0%, transparent 70%)' }} />

      {/* Particle canvas — pointer-events on window, not canvas, so clicks pass through */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </>
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
              Digitally verifiable certificates — trusted by employers & HRs
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
              Every certificate issued on ListedIndia Verify gets a <strong className="text-gray-700">unique public verification link</strong> — so employers, HRs, and recruiters can confirm authenticity instantly, without calling or emailing the issuing organization.
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
                { val: '500+', label: 'Organizations' },
                { val: '50K+', label: 'Certs issued' },
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
                <span className="ml-3 text-xs text-gray-400 font-mono">verify.listedindia.com/company/certificates</span>
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
                Traditional certificate verification means calling or emailing the issuing company — taking days and consuming valuable HR bandwidth. With ListedIndia Verify, any recruiter or employer can verify a candidate's certificate in under 10 seconds, directly on our platform, with no account needed.
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
                <span className="font-bold">verify.listedindia.com/verify/</span><span className="text-violet-500">{'<unique-certificate-id>'}</span> — open to anyone, no login required.
              </p>
            </div>
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
            Two ways to run your program
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Choose who bears the certificate cost — or let the market decide.
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
                <h3 className="text-lg font-bold text-gray-900">Participant Pays</h3>
              </div>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Participants pay the certificate fee directly via our secure payment gateway. You set the price per certificate. Certificates are automatically issued upon payment — no manual steps.
            </p>
            <ul className="space-y-2.5">
              {['Organization sets per-certificate price','Payments via PayU — UPI, cards, netbanking','Auto-issuance on successful payment','Per-transaction revenue reporting'].map(item => (
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
    { label: 'Internship / Fellowship', colorBar: 'bg-blue-500', colorText: 'text-blue-700', colorBg: 'bg-blue-50', desc: 'For industry internships and fellowship programs' },
    { label: 'Course Completion', colorBar: 'bg-emerald-500', colorText: 'text-emerald-700', colorBg: 'bg-emerald-50', desc: 'Online and offline training courses' },
    { label: 'Participation', colorBar: 'bg-amber-500', colorText: 'text-amber-700', colorBg: 'bg-amber-50', desc: 'Events, seminars, and conferences' },
    { label: 'Hackathon', colorBar: 'bg-rose-500', colorText: 'text-rose-700', colorBg: 'bg-rose-50', desc: 'Coding challenges and innovation sprints' },
    { label: 'Other', colorBar: 'bg-violet-500', colorText: 'text-violet-700', colorBg: 'bg-violet-50', desc: 'Any custom certification need' },
  ]

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
              Whether you run internship programs, coding bootcamps, or annual conferences — ListedIndia Verify handles all certificate types with the same streamlined workflow.
            </p>
            <div className="space-y-3">
              {types.map(({ label, colorBar, colorText, colorBg, desc }) => (
                <div key={label} className={`flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all`}>
                  <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${colorBar}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${colorText}`}>{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <div className={`w-6 h-6 rounded-full ${colorBg} flex items-center justify-center flex-shrink-0`}>
                    <Check className={`w-3.5 h-3.5 ${colorText}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — certificate preview */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-100 to-blue-100 blur-3xl opacity-60 rounded-3xl" />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-w-sm mx-auto">
              <div className="h-1.5 bg-gradient-to-r from-violet-600 via-purple-500 to-blue-500" />
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-violet-600 rounded-lg flex items-center justify-center">
                      <Award className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">ListedIndia Verify</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded-lg">LIV·2026·08XA</span>
                </div>

                <div className="text-center mb-7">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1.5">Certificate of</p>
                  <h3 className="text-xl font-bold text-gray-900">Internship Completion</h3>
                  <div className="w-12 h-0.5 bg-gradient-to-r from-violet-500 to-blue-500 mx-auto mt-3 rounded-full" />
                </div>

                <div className="text-center mb-7">
                  <p className="text-xs text-gray-400 mb-1">Awarded to</p>
                  <p className="text-lg font-bold text-violet-700">Priya Sharma</p>
                  <p className="text-xs text-gray-500 mt-1">Frontend Development Internship</p>
                  <p className="text-xs text-gray-400 mt-0.5">TechCorp Solutions Pvt. Ltd.</p>
                </div>

                <div className="flex justify-between items-end pt-5 border-t border-gray-100">
                  <div>
                    <div className="w-20 h-px bg-gray-300 mb-1" />
                    <p className="text-[10px] text-gray-400">Authorized by</p>
                    <p className="text-[11px] font-semibold text-gray-600">TechCorp Solutions</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 bg-gray-50 border border-gray-200 rounded-lg p-1.5">
                      <div className="grid grid-cols-5 gap-px h-full">
                        {Array.from({length:25}).map((_,i)=>(
                          <div key={i} className={`rounded-[1px] ${[0,1,2,5,10,15,20,21,22,4,9,14,19,24,12,6,16,8,18][i%19]!==undefined&&(i*3+1)%3!==0?'bg-gray-800':'bg-transparent'}`}/>
                        ))}
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400">Scan to verify</p>
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-gradient-to-r from-blue-500 via-violet-500 to-purple-600" />

              <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Verified
              </div>
            </div>
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
    { type: 'Internship / Fellowship', price: '₹499', icon: '🎓', highlight: false, color: 'border-blue-200 bg-blue-50/40', labelColor: 'text-blue-700', badge: '' },
    { type: 'Course Completion', price: '₹299', icon: '📘', highlight: true, color: 'border-violet-300 bg-white ring-2 ring-violet-200 shadow-lg', labelColor: 'text-violet-700', badge: 'Most popular' },
    { type: 'Participation / Other', price: '₹199', icon: '🏅', highlight: false, color: 'border-gray-200 bg-gray-50/40', labelColor: 'text-gray-700', badge: '' },
  ]
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <span className="inline-block bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider mb-4">Pricing</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Simple, per-certificate pricing</h2>
          <p className="mt-4 text-gray-500 text-lg">
            No subscriptions. No setup fees. Pay only for certificates issued.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map(({ type, price, icon, color, labelColor, badge }) => (
            <div key={type} className={`rounded-2xl border p-7 relative transition-all hover:shadow-md ${color}`}>
              {badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  {badge}
                </span>
              )}
              <div className="text-3xl mb-5">{icon}</div>
              <p className={`font-bold text-sm mb-2 ${labelColor}`}>{type}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-gray-900">{price}</span>
              </div>
              <p className="text-sm text-gray-400 mb-5">per certificate</p>
              <div className="border-t border-gray-200 pt-5">
                <p className="text-xs text-gray-500">Both payment models supported. No platform subscription required.</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          Prices configurable by platform admin. Custom pricing available for enterprise clients.
        </p>
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
          Stop issuing certificates that no one can verify. Every certificate on ListedIndia Verify comes with a permanent public link — so employers and HRs can confirm authenticity in seconds.
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
    { heading: 'Legal', links: [{ label:'Terms & Conditions', to:'/terms' },{ label:'Privacy Policy', to:'/privacy' },{ label:'Refund Policy', to:'/refund' },{ label:'Delivery Policy', to:'/delivery' }] },
  ]

  return (
    <footer className="bg-gray-900 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-sm">ListedIndia Verify</span>
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

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} ListedIndia Verify. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span>Digital certificates only — no physical delivery</span>
            <span>·</span>
            <Link to="/auth/admin/login" className="hover:text-gray-400 transition-colors">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
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
      <PaymentModels />
      <HowItWorks />
      <CertificateTypes />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}
