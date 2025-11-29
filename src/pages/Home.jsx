export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0F26] to-[#0A0D1F] text-white px-6 py-10">

      {/* NAVBAR */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-20">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center">
            <span className="text-white text-xl">📅</span>
          </div>
          <span className="text-2xl font-semibold">Ritto</span>
        </div>

        {/* Botones */}
        <div className="flex gap-4">
          <a
            href="/login"
            className="px-6 py-2 rounded-3xl border border-white/20 bg-white/5 hover:bg-white/10 transition"
          >
            Iniciar sesión
          </a>

          <a
            href="/register"
            className="px-6 py-2 rounded-3xl bg-white/10 border border-white/20 hover:bg-white/20 transition"
          >
            Registrarse
          </a>
        </div>
      </div>

      {/* HERO */}
      <div className="text-center max-w-3xl mx-auto mt-10">
        <h1 className="text-5xl font-bold mb-4">Agenda automatizada</h1>

        <p className="text-slate-300 text-xl">
          Simplifica tus reservas con una plataforma <span className="font-semibold text-white">profesional.</span>
        </p>
      </div>

      {/* BENEFICIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 max-w-6xl mx-auto mt-24">

        {/* NOTIFICACIONES */}
        <div className="text-center">
          <div className="text-4xl mb-3">✉️</div>
          <h3 className="font-semibold mb-1">Notificación a clientes</h3>
          <p className="text-slate-400 text-sm">Mantené a tus clientes informados en cada paso.</p>
        </div>

        {/* RECORDATORIOS */}
        <div className="text-center">
          <div className="text-4xl mb-3">🔔</div>
          <h3 className="font-semibold mb-1">Recordatorios automáticos</h3>
          <p className="text-slate-400 text-sm">Evitá ausencias enviando recordatorios automáticos.</p>
        </div>

        {/* PANEL */}
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="font-semibold mb-1">Panel de control</h3>
          <p className="text-slate-400 text-sm">Accedé fácilmente a informes y ajustes clave.</p>
        </div>

        {/* SOPORTE */}
        <div className="text-center">
          <div className="text-4xl mb-3">🎧</div>
          <h3 className="font-semibold mb-1">Servicio técnico en español</h3>
          <p className="text-slate-400 text-sm">Soporte humano y rápido siempre que lo necesites.</p>
        </div>

      </div>
    </div>
  );
}
