import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0A0F1F] text-white flex flex-col">

      {/* TOP BAR */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center">
            <span className="text-[#0A0F1F] text-xl font-bold">📅</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Ritto</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-5 py-2 rounded-full border border-white/20 text-sm hover:bg-white/10 transition"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="px-5 py-2 rounded-full bg-white text-[#0A0F1F] font-semibold text-sm hover:bg-slate-200 transition"
          >
            Registrarse
          </Link>
        </div>
      </header>

      {/* HERO */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
          Agenda automatizada
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl leading-relaxed">
          Simplificá tus reservas con una plataforma <span className="font-semibold text-white">profesional</span>.
        </p>

        {/* --- BOTONES ELIMINADOS COMO PEDISTE --- */}
        {/* (Antes había “Reservar ahora” y “Más información”) */}

        {/* FEATURES */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mt-16 w-full max-w-5xl">

          <div className="flex flex-col items-center text-center">
            <span className="text-3xl mb-2">✉️</span>
            <h3 className="text-sm font-semibold">Notificación a clientes</h3>
            <p className="text-xs text-slate-400 mt-1 w-40">
              Mantené informados a tus clientes en cada paso.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="text-3xl mb-2">🔔</span>
            <h3 className="text-sm font-semibold">Recordatorios automáticos</h3>
            <p className="text-xs text-slate-400 mt-1 w-40">
              Evitá olvidos con recordatorios automáticos.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="text-3xl mb-2">📊</span>
            <h3 className="text-sm font-semibold">Panel de control</h3>
            <p className="text-xs text-slate-400 mt-1 w-40">
              Informes claros y control total del negocio.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="text-3xl mb-2">🎧</span>
            <h3 className="text-sm font-semibold">Servicio técnico en español</h3>
            <p className="text-xs text-slate-400 mt-1 w-40">
              Soporte cercano siempre que lo necesites.
            </p>
          </div>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="text-center text-[11px] text-slate-500 py-6">
        Ritto · Hecho en Uruguay · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
