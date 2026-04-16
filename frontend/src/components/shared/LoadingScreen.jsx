import { useEffect, useState } from 'react'

const QUOTES = [
  { text: 'Every achievement deserves to be remembered.', sub: 'Issue certificates that last forever.' },
  { text: 'Credentials you can trust at a glance.', sub: 'Verified in seconds. Trusted for life.' },
  { text: 'Your hard work, permanently on record.', sub: 'Digitally issued. Publicly verifiable.' },
  { text: 'Authenticity is the rarest credential of all.', sub: 'We make it provable.' },
  { text: 'From internships to hackathons — every milestone counts.', sub: 'Certificate infrastructure for modern organizations.' },
  { text: 'HR teams shouldn\'t spend days verifying credentials.', sub: 'One link. Instant proof.' },
]

export function LoadingScreen() {
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length))
  const [visible, setVisible] = useState(true)
  const [dots, setDots] = useState(0)

  /* rotate quotes every 3 s with fade */
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setQuoteIdx(i => (i + 1) % QUOTES.length)
        setVisible(true)
      }, 400)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  /* animated dots */
  useEffect(() => {
    const t = setInterval(() => setDots(d => (d + 1) % 4), 450)
    return () => clearInterval(t)
  }, [])

  const q = QUOTES[quoteIdx]

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white overflow-hidden">

      {/* ── Background ambient glows ── */}
      <div className="absolute pointer-events-none"
        style={{ top: '-10%', right: '-10%', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, #ede9fe 0%, transparent 70%)', filter: 'blur(80px)',
          animation: 'loadOrb1 6s ease-in-out infinite' }} />
      <div className="absolute pointer-events-none"
        style={{ bottom: '-10%', left: '-10%', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, #dbeafe 0%, transparent 70%)', filter: 'blur(70px)',
          animation: 'loadOrb2 8s ease-in-out infinite' }} />

      <style>{`
        @keyframes loadOrb1 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(-30px, 30px) scale(1.1); }
        }
        @keyframes loadOrb2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(30px,-20px) scale(1.08); }
        }
        @keyframes breathe {
          0%,100% { transform: scale(1);     opacity: 1; }
          50%      { transform: scale(1.08);  opacity: 0.85; }
        }
        @keyframes ripple {
          0%   { transform: scale(0.8); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes spinRing {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes spinRingRev {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideDown {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-8px); }
        }
        @keyframes barGrow {
          0%   { width: 0%; }
          60%  { width: 75%; }
          100% { width: 92%; }
        }
        @keyframes nodePulse {
          0%,100% { opacity: 0.3; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.4); }
        }
      `}</style>

      {/* ── Central logo + breathing ring ── */}
      <div className="relative flex items-center justify-center mb-10">

        {/* Ripple rings */}
        {[0, 1, 2].map(i => (
          <div key={i} className="absolute rounded-full border border-violet-300/40 pointer-events-none"
            style={{ width: 80, height: 80,
              animation: `ripple 2.4s ease-out ${i * 0.8}s infinite` }} />
        ))}

        {/* Outer spinning dashed ring */}
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 80, height: 80,
            border: '1.5px dashed #c4b5fd',
            animation: 'spinRing 8s linear infinite' }} />

        {/* Inner reverse spinning ring */}
        <div className="absolute rounded-full pointer-events-none"
          style={{ width: 60, height: 60,
            border: '1.5px solid #a5b4fc',
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            animation: 'spinRingRev 3s linear infinite' }} />

        {/* Logo pill */}
        <div className="relative z-10 flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg shadow-violet-200/60"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            animation: 'breathe 2.8s ease-in-out infinite' }}>
          <span className="text-xl font-bold text-white tracking-tight select-none">LV</span>
        </div>
      </div>

      {/* ── Brand name ── */}
      <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] mb-8 select-none">
        ListedIndia <span className="text-violet-500">Verify</span>
      </p>

      {/* ── Rotating quote ── */}
      <div className="relative text-center px-8 mb-10" style={{ minHeight: 72 }}>
        <p className="text-lg sm:text-xl font-semibold text-gray-800 leading-snug mb-2 max-w-md mx-auto"
          style={{
            transition: 'opacity 0.35s ease, transform 0.35s ease',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(-8px)',
          }}>
          "{q.text}"
        </p>
        <p className="text-sm text-gray-400"
          style={{
            transition: 'opacity 0.35s ease 0.05s',
            opacity: visible ? 1 : 0,
          }}>
          {q.sub}
        </p>
      </div>

      {/* ── Progress bar ── */}
      <div className="w-48 h-0.5 bg-gray-100 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
          style={{ animation: 'barGrow 12s linear forwards' }} />
      </div>

      {/* ── Loading dots ── */}
      <p className="text-xs text-gray-400 tracking-widest select-none">
        Loading{'.'.repeat(dots)}
      </p>

      {/* ── Floating node decorations ── */}
      {[
        { top: '15%', left: '12%',  size: 6,  delay: 0   },
        { top: '25%', right: '10%', size: 4,  delay: 0.4 },
        { top: '70%', left: '8%',   size: 5,  delay: 0.8 },
        { top: '75%', right: '12%', size: 7,  delay: 1.2 },
        { top: '45%', left: '5%',   size: 4,  delay: 0.6 },
        { top: '55%', right: '6%',  size: 5,  delay: 1.0 },
      ].map((n, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none"
          style={{ top: n.top, left: n.left, right: n.right,
            width: n.size, height: n.size,
            background: i % 2 === 0 ? '#7c3aed' : '#4f46e5',
            animation: `nodePulse 2.5s ease-in-out ${n.delay}s infinite` }} />
      ))}
    </div>
  )
}
