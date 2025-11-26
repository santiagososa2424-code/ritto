import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {/* Top bar */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center text-slate-950 font-semibold">
            R
          </div>
          <span className="text-sm font-medium tracking-tight">Ritto</span>
        </div>

        <nav className="hidden sm:flex items-center gap-6 text-xs text-slate-300">
          <a href="#features" className="hover:text-slate-100 transition">
            Funcionalidades
          </a>
          <a href="#how" className="hover:text-slate-100 transition">
            Cómo funciona
          </a>
          <a href="#pricing" className="hover:text-slate-100 transition">
            Precio
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="text-xs text-slate-300 hover:text-slate-100"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="text-xs rounded-2xl bg-emerald-400 text-slate-950 font-semibold px-4 py-2 hover:bg-emerald-300 transition"
          >
            Probar gratis
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="px-6 pt-8 pb-16 max-w-6xl mx-auto">
        <section className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300 mb-3">
              Agenda automática para negocios
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Dejá de responder mensajes.
              <br />
              Ritto agenda los turnos por vos.
            </h1>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">
              Ritto es una agenda online pensada para barberías, salones y
              estudios que quieren dejar de coordinar turnos por WhatsApp y
              tener todo ordenado en un solo lugar.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="rounded-2xl bg-emerald-400 text-slate-950 text-sm font-semibold px-5 py-2.5 hover:bg-emerald-300 transition"
              >
                Crear cuenta gratis
              </Link>
              <Link
                to="/login"
                className="rounded-2xl border border-white/15 text-slate-100 text-sm px-5 py-2.5 hover:bg-white/5 transition"
              >
                Ya tengo cuenta
              </Link>
            </div>

            <p className="mt-3 text-[11px] text-slate-400">
              30 días gratis · Sin tarjeta · Cancelás cuando quieras.
            </p>
          </div>

          {/* Mock panel */}
          <div className="hidden md:block">
            <div className="rounded-3xl bg-slate-900/70 border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-300">Hoy</p>
                <p className="text-xs text-emerald-300">Agenda llena · 12 turnos</p>
              </div>

              <div className="grid gap-2 text-xs">
                {["09:00", "09:30", "10:00", "10:30", "11:00"].map((h, i) => (
                  <div
                    key={h}
                    className="flex items-center justify-between rounded-2xl bg-slate-900/70 border border-white/10 px-3 py-2"
                  >
                    <div>
                      <p className="text-slate-50 font-medium">
                        {h} · Corte clásico
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Cliente #{i + 1}
                      </p>
                    </div>
                    <span className="text-[11px] text-emerald-300">
                      Confirmado
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <p className="text-[11px] text-slate-400">
                  Link único para tus clientes:
                </p>
                <span className="text-[11px] text-slate-100 font-mono">
                  ritto.lat/tu-negocio
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mt-16 grid md:grid-cols-3 gap-6">
          <div className="rounded-3xl bg-slate-900/70 border border-white/10 p-5 text-sm">
            <p className="text-emerald-300 font-semibold mb-2">
              Turnos 24/7
            </p>
            <p className="text-slate-300 text-[13px]">
              Tus clientes reservan cuando quieran. Ritto se encarga de los
              horarios disponibles y evita superposiciones.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-900/70 border border-white/10 p-5 text-sm">
            <p className="text-emerald-300 font-semibold mb-2">
              Señas con Mercado Pago
            </p>
            <p className="text-slate-300 text-[13px]">
              Activá señas fijas o porcentuales y reducí los no-shows sin
              pelear más por WhatsApp.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-900/70 border border-white/10 p-5 text-sm">
            <p className="text-emerald-300 font-semibold mb-2">
              100% uruguayo
            </p>
            <p className="text-slate-300 text-[13px]">
              Ritto está pensado para la realidad de Uruguay: horarios,
              moneda local y soporte cercano.
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mt-16">
          <div className="rounded-3xl bg-slate-900/70 border border-white/10 p-6 max-w-md mx-auto text-center">
            <p className="text-xs text-slate-400 mb-1 uppercase tracking-[0.2em]">
              Precio simple
            </p>
            <p className="text-3xl font-semibold">$690</p>
            <p className="text-xs text-slate-400 mb-4">por mes / por negocio</p>
            <p className="text-[12px] text-slate-300 mb-4">
              Sin límite de turnos, sin sorpresas. Probás 30 días gratis y
              después decidís.
            </p>
            <Link
              to="/register"
              className="w-full inline-block rounded-2xl bg-emerald-400 text-slate-950 font-semibold text-sm py-3 hover:bg-emerald-300 transition"
            >
              Empezar prueba gratis
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 text-[11px] text-slate-500 text-center">
          Ritto · Hecho en Uruguay · {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  );
}
