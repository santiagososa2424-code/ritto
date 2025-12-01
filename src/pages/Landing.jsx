import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#090E1A] text-white flex flex-col">

      {/* LOGO + BOTONES */}
      <header className="w-full px-8 py-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center">
            <span className="text-[#090E1A] text-xl font-bold">📅</span>
          </div>
          <h1 className="text-xl font-semibold">Ritto</h1>
        </div>

        {/* Botones */}
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-6 py-2 rounded-full border border-white/20 hover:bg-white/10 transition text-sm"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="px-6 py-2 rounded-full bg-white text-[#090E1A] font-semibold text-sm hover:bg-slate-200 transition"
          >
            Registrarse
          </Link>
        </div>
      </header>

      {/* HERO */}
      <main className="flex flex-col items-center justify-center text-center pt-16 pb-20 px-6">

        <h1 className="text-5xl font-bold tracking-tight mb-4">
          Agenda automatizada
        </h1>

        <p className="text-xl text-slate-300 max-w-2xl">
          Simplificá tus reservas con una plataforma{" "}
          <span className="font-semibold text-white">profesional</span>.
        </p>

        {/* FEATURES */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-12 mt-20 max-w-5xl w-full">

          {/* 1 */}
          <div className="flex flex-col items-center">
            <span className="text-4xl mb-3">✉️</span>
            <h3 className="font-semibold text-lg">Notificación a clientes</h3>
            <p className="text-slate-400 text-sm mt-1 text-center">
              Mantené informados a tus clientes en cada paso.
            </p>
          </div>

          {/* 2 */}
          <div className="flex flex-col items-center">
            <span className="text-4xl mb-3">🔔</span>
            <h3 className="font-semibold text-lg">Recordatorios automáticos</h3>
            <p className="text-slate-400 text-sm mt-1 text-center">
              Evitá olvidos con recordatorios automáticos.
            </p>
          </div>

          {/* 3 */}
          <div className="flex flex-col items-center">
            <span className="text-4xl mb-3">📊</span>
            <h3 className="font-semibold text-lg">Panel de control</h3>
            <p className="text-slate-400 text-sm mt-1 text-center">
              Informes claros y control total del negocio.
            </p>
          </div>

          {/* 4 */}
          <div className="flex flex-col items-center">
            <span className="text-4xl mb-3">🎧</span>
            <h3 className="font-semibold text-lg">Servicio técnico en español</h3>
            <p className="text-slate-400 text-sm mt-1 text-center">
              Soporte cercano siempre que lo necesites.
            </p>
          </div>

        </div>
      </main>

    </div>
  );
}
