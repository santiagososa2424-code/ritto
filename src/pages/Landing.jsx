import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f1f] via-[#0b1430] to-[#0a0f1f] text-white px-6">

      {/* TOP BAR */}
      <header className="max-w-6xl mx-auto py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center">
            <span className="text-[#0A0F1F] text-xl font-bold">📅</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Ritto</h1>
        </div>

        <div className="flex items-center gap-4">
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
      <div className="text-center max-w-4xl mx-auto mt-20">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
          Agenda automatizada
        </h1>

        <p className="text-xl text-slate-300">
          Simplificá tus reservas con una plataforma{" "}
          <span className="font-semibold text-white">profesional</span>.
        </p>
      </div>

      {/* FEATURES */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-12 max-w-5xl mx-auto mt-24 pb-24">

        <div className="flex flex-col items-center text-center">
          <span className="text-4xl mb-3">✉️</span>
          <h3 className="text-lg font-semibold">Notificación a clientes</h3>
          <p className="text-sm text-slate-400 mt-1">
            Mantén a tus clientes informados en cada paso.
          </p>
        </div>

        <div className="flex flex-col items-center text-center">
          <span className="text-4xl mb-3">🔔</span>
          <h3 className="text-lg font-semibold">Recordatorios automáticos</h3>
          <p className="text-sm text-slate-400 mt-1">
            Evitá olvidos con recordatorios automáticos.
          </p>
        </div>

        <div className="flex flex-col items-center text-center">
          <span className="text-4xl mb-3">📊</span>
          <h3 className="text-lg font-semibold">Panel de control</h3>
          <p className="text-sm text-slate-400 mt-1">
            Informes claros y control total del negocio.
          </p>
        </div>

        <div className="flex flex-col items-center text-center">
          <span className="text-4xl mb-3">🎧</span>
          <h3 className="text-lg font-semibold">Servicio técnico en español</h3>
          <p className="text-sm text-slate-400 mt-1">
            Soporte especializado siempre que lo necesites.
          </p>
        </div>

      </div>

    </div>
  );
}
