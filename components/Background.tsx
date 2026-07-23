'use client'

export function Background() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid opacity-60" />

      {/* Gradient orbs */}
      <div
        className="absolute -top-[300px] -left-[200px] w-[700px] h-[700px] rounded-full animate-float"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute top-[40%] -right-[250px] w-[600px] h-[600px] rounded-full animate-float-delay"
        style={{
          background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute -bottom-[200px] left-[30%] w-[500px] h-[500px] rounded-full animate-float"
        style={{
          background: 'radial-gradient(circle, rgba(129,140,248,0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animationDelay: '-7s',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, #050505 100%)',
        }}
      />
    </div>
  )
}

