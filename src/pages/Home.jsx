export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1025] to-[#0A0C1C] text-white px-6 py-10">
      
      {/* NAVBAR */}
      <header className="flex items-center justify-between max-w-6xl mx-auto mb-20">
        <div className="flex items-center gap-2">
          <div className="bg-white/10 h-8 w-8 rounded-lg flex items-center justify-center">
            <span className="text-xl">📅</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Ritto</h1>
        </div>

        <div className="flex items-center gap-4">
          <a 
            href="/login"
            className="px-5 py-2 text-sm border border-white/20 rounded-full hover:bg-white/10 transition"
          >
            Iniciar sesión
          </a>

          <a 
            href="/register"
            className="px-5 py-2 text-sm bg-white/10 border border-white/10 rounded-full hover:bg-white/20 transition"
          >
            Registrarse
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="text-center max-w-4xl mx-auto">
        <h2 className="text-5xl font-bold leading-tight mb-4">
          Agenda <span className="text-white/90">automatizada</span>
        </h2>

        <p className="text-lg text-white/70 max-w-2xl mx-auto">
          Simplifica tus reservas con una plataforma <span className="font-semibold text-white">profesional</span>.
        </p>
      </section>

      {/* BENEFICIOS */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-10 max-w-5xl mx-auto mt-24">

        <div className="text-center space-y-3">
          <div className="text-4xl">✉️</div>
          <h3 className="font-semibold">Notificación a clientes</h3>
          <p className="text-sm text-white/60">Mantené a tus clientes informados en cada paso.</p>
        </div>

        <div className="text-center space-y-3">
          <div className="text-4xl">🔔</div>
          <h3 className="font-semibold">Recordatorios automáticos</h3>
          <p className="text-sm text-white/60">Evitá ausencias con avisos inteligentes.</p>
        </div>

        <div className="text-center space-y-3">
          <div className="text-4xl">📊</div>
          <h3 className="font-semibold">Panel de control</h3>
          <p className="text-sm text-white/60">Informes y ajustes clave al instante.</p>
        </div>

        <div className="text-center space-y-3">
          <div className="text-4xl">🎧</div>
          <h3 className="font-semibold">Servicio técnico en español</h3>
          <p className="text-sm text-white/60">Soporte rápido y humano 24/7.</p>
        </div>

      </section>
    </div>
  );
}
