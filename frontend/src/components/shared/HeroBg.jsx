export default function HeroBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Mesh gradient wash */}
      <div className="absolute inset-0" style={{
        background: [
          'radial-gradient(ellipse 80% 60% at 75% -10%, rgba(139,92,246,0.10) 0%, transparent 60%)',
          'radial-gradient(ellipse 60% 50% at -5% 60%,  rgba(99,102,241,0.08) 0%, transparent 55%)',
          'radial-gradient(ellipse 50% 40% at 50% 110%, rgba(167,139,250,0.07) 0%, transparent 50%)',
          '#ffffff',
        ].join(', '),
      }} />

      {/* Fine dot grid — fades to edges */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'radial-gradient(circle, #c4b5fd 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        opacity: 0.22,
        maskImage: 'radial-gradient(ellipse 65% 55% at 50% 45%, black 10%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 45%, black 10%, transparent 75%)',
      }} />

      {/* Single soft accent line across top */}
      <div className="absolute top-0 inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.25) 40%, rgba(99,102,241,0.20) 60%, transparent 100%)' }} />
    </div>
  )
}
