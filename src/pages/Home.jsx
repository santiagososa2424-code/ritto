import { Link } from "react-router-dom";

export default function Home() {
  const bubbles = [
    { icon: "💳", title: "Control de señas", desc: "Manejá pendientes y confirmados desde el panel." },
    { icon: "✉️", title: "Emails automáticos", desc: "Confirmación y recordatorio para tus clientes." },
    { icon: "📊", title: "Ingresos y gastos", desc: "Control mensual claro y simple para tu negocio." },
    { icon: "🔗", title: "Link único", desc: "Tu enlace listo para compartir y recibir reservas." },
    { icon: "🆓", title: "30 días gratis", desc: "Probalo creando tu cuenta. Sin vueltas." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0F26] to-[#0A0D1F] text-white px-6 py-10">
      {/* NAVBAR */}
      <div className="max-w-6xl mx-auto flex justify-between items-center mb-16">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center">
            <span className="text-white text-lg font-semibold">R</span>
          </div>
          <span className="text-2xl font-semibold tracking-tight">Ritto</span>
        </div>

        {/* Botones (solo estos 2) */}
        <div className="flex gap-3">
          <Link
            to="/login"
            className="px-6 py-2 rounded-3xl border border-white/20 bg-white/5 hover:bg-white/10 transition text-sm"
          >
            Iniciar sesión
          </Link>

          <Link
            to="/register"
            className="px-6 py-2 rounded-3xl bg-white/10 border border-white/20 hover:bg-white/20 transition text-sm font-medium"
          >
            Registrarse
          </Link>
        </div>
      </div>

      {/* HERO */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* LEFT */}
        <div className="text-left">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Tu agenda y tu negocio <span className="text-white/90">bajo control</span>
          </h1>

          <p className="text-slate-300 text-lg mt-4 max-w-xl">
            Tu agenda automatizada hecha a tu medida.
          </p>

          {/* Burbujas (en PC se ven arriba a la derecha en el layout, en mobile quedan abajo al scrollear) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
            {bubbles.map((b) => (
              <div
                key={b.title}
                className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-5 hover:bg-white/10 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{b.icon}</div>
                  <div>
                    <h3 className="font-semibold mb-1">{b.title}</h3>
                    <p className="text-slate-400 text-sm">{b.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Soporte técnico (una sola vez, abajo a la izquierda) */}
          <div className="mt-10 text-sm text-slate-400">
            Soporte técnico:{" "}
            <a
              href="https://wa.me/59893403706"
              target="_blank"
              rel="noreferrer"
              className="text-white hover:text-slate-200 transition"
            >
              093403706
            </a>
          </div>
        </div>

        {/* RIGHT: preview simple (sin prometer “dashboard real”) */}
        <div className="lg:pt-2">
          <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-3">
              Vista rápida
            </p>

            <div className="grid grid-cols-2 gap-4">
              <MiniCard label="Turnos semana" value="12" />
              <MiniCard label="Ocupación hoy" value="78%" />
              <MiniCard label="Ingresos" value="$ 24.600" />
              <MiniCard label="Gastos" value="$ 6.800" />
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
              <div className="grid grid-cols-3 text-[11px] border-b border-white/10 bg-white/5">
                <div className="px-3 py-2 text-slate-300 border-r border-white/10">Fecha</div>
                <div className="px-3 py-2 text-slate-300 border-r border-white/10">Hora</div>
                <div className="px-3 py-2 text-slate-300">Cliente</div>
              </div>
              <Row date="Hoy" hour="16:30" name="Valentina" />
              <Row date="Mañana" hour="12:00" name="Martín" />
              <Row date="Vie" hour="18:00" name="Sofi" />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-3">
            Minimalista, rápido y con el estilo de Ritto.
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ label, value }) {
  return (
    <div className="rounded-3xl bg-white/5 border border-white/10 p-4">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className="text-xl font-semibold mt-2">{value}</p>
    </div>
  );
}

function Row({ date, hour, name }) {
  return (
    <div className="grid grid-cols-3 border-b border-white/10">
      <div className="px-3 py-2.5 text-slate-200 border-r border-white/10">{date}</div>
      <div className="px-3 py-2.5 text-slate-200 border-r border-white/10">{hour}</div>
      <div className="px-3 py-2.5 text-slate-200">{name}</div>
    </div>
  );
}
