import React from "react";

/**
 * DashboardPreview.jsx
 * - Preview visual del dashboard (landing/home)
 * - NO usa supabase, NO usa efectos, NO hace fetch
 * - Datos fake y componentes livianos
 * - Mantiene estética Ritto (azul oscuro, bordes suaves, blur)
 */

export default function DashboardPreview() {
  // Datos fake (editable)
  const data = {
    weekTurns: 12,
    revenue: 61000,
    expenses: 15000,
    occupation: 74,
    nextBookings: [
      {
        date: "2026-01-24",
        hour: "15:15",
        customer: "Sofía",
        service: "Corte",
        status: "Confirmado",
        deposit: "—",
      },
      {
        date: "2026-01-25",
        hour: "18:00",
        customer: "Martín",
        service: "Barba",
        status: "Pendiente",
        deposit: "Ver",
      },
    ],
    planDaysLeft: 22,
    publicLink: "https://www.ritto.lat/book/tu-negocio",
  };

  const money = (n) =>
    new Intl.NumberFormat("es-UY").format(Number(n || 0));

  return (
    <div className="w-full">
      {/* CONTENEDOR “APP” */}
      <div className="rounded-[28px] border border-white/10 bg-slate-900/40 backdrop-blur-xl shadow-[0_30px_120px_rgba(0,0,0,0.65)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr]">
          {/* SIDEBAR (preview) */}
          <aside className="hidden lg:block border-r border-white/10 bg-slate-950/30">
            <div className="p-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sky-400/20 border border-sky-300/20 flex items-center justify-center text-sky-200 font-semibold">
                R
              </div>
              <div className="leading-tight">
                <div className="text-slate-100 font-semibold">Ritto</div>
                <div className="text-[11px] text-slate-400">Agenda inteligente</div>
              </div>
            </div>

            <nav className="px-3 pb-5 space-y-1">
              <SideItem active>Resumen</SideItem>
              <SideItem>Servicios</SideItem>
              <SideItem>Horarios</SideItem>
              <SideItem>Bloqueos</SideItem>
              <SideItem>Gastos</SideItem>
              <SideItem>Ajustes</SideItem>
            </nav>
          </aside>

          {/* MAIN */}
          <main className="p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-950/10 via-slate-900/10 to-slate-950/10">
            {/* TOP BAR */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] tracking-[0.22em] text-slate-400 uppercase">
                  Panel de control
                </div>
                <div className="text-2xl sm:text-3xl font-semibold text-slate-100 mt-1">
                  Bienvenido, <span className="text-emerald-300">Ritto</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[12px] px-3 py-1.5 rounded-2xl border border-white/10 bg-white/5 text-slate-200">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 mr-2 align-middle" />
                  Agenda activa
                </span>
                <div className="h-10 w-10 rounded-full bg-slate-800/60 border border-white/10 flex items-center justify-center text-slate-200">
                  R
                </div>
              </div>
            </div>

            {/* METRICS */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mt-6">
              <MetricCard
                label="Turnos de la semana"
                value={data.weekTurns}
                pill="Agenda"
                sublabel="Próximos 7 días"
              />
              <MetricCard
                label="Ingresos"
                value={`$ ${money(data.revenue)}`}
                pill="Ingresos"
                sublabel="Este mes"
              />
              <MetricCard
                label="Gastos"
                value={`$ ${money(data.expenses)}`}
                pill="Gastos"
                sublabel="Este mes"
              />
              <MetricCard
                label="Ocupación"
                value={`${data.occupation}%`}
                pill="Capacidad"
                sublabel="Hoy"
              />
            </section>

            {/* GRID PRINCIPAL */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mt-6">
              {/* Tabla turnos */}
              <div className="lg:col-span-2 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl shadow p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-slate-100 font-semibold">Turnos de la semana</div>
                    <div className="text-[12px] text-slate-400">Próximos 7 días</div>
                  </div>

                  {/* Botón fake (solo visual) */}
                  <span className="text-[12px] px-3 py-1.5 rounded-2xl border border-white/10 bg-white/5 text-slate-200">
                    Ver calendario
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 overflow-hidden">
                  <div className="grid grid-cols-[110px_70px_1fr_110px_80px] bg-slate-950/40 text-[11px] text-slate-400">
                    <div className="px-3 py-2 border-r border-white/10">Fecha</div>
                    <div className="px-3 py-2 border-r border-white/10">Hora</div>
                    <div className="px-3 py-2 border-r border-white/10">Cliente · Servicio · Estado</div>
                    <div className="px-3 py-2 border-r border-white/10">Seña</div>
                    <div className="px-3 py-2">Acción</div>
                  </div>

                  {data.nextBookings.map((b, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[110px_70px_1fr_110px_80px] text-[12px] text-slate-200 bg-slate-900/30 border-t border-white/10"
                    >
                      <div className="px-3 py-3 border-r border-white/10">{b.date}</div>
                      <div className="px-3 py-3 border-r border-white/10">{b.hour}</div>
                      <div className="px-3 py-3 border-r border-white/10">
                        <div className="font-medium text-slate-100">{b.customer}</div>
                        <div className="text-[11px] text-slate-400">
                          {b.service} ·{" "}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-xl border ${
                              b.status === "Confirmado"
                                ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
                                : "border-amber-500/40 text-amber-300 bg-amber-500/10"
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                      </div>
                      <div className="px-3 py-3 border-r border-white/10">
                        {b.deposit === "Ver" ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-xl border border-white/10 bg-white/5 text-slate-200">
                            Ver PDF
                          </span>
                        ) : (
                          <span className="text-slate-400">{b.deposit}</span>
                        )}
                      </div>
                      <div className="px-3 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded-xl border border-white/10 bg-white/5 text-slate-200">
                          Ver
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columna derecha */}
              <div className="space-y-4">
                <div className="rounded-3xl bg-slate-900/50 border border-emerald-500/20 backdrop-blur-xl shadow p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-emerald-300 font-semibold">Plan activo</div>
                    <span className="text-[11px] px-2 py-1 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
                      {data.planDaysLeft} días
                    </span>
                  </div>

                  <div className="mt-2 text-slate-100 font-semibold">
                    Tenés el plan activo por {data.planDaysLeft} días
                  </div>
                  <div className="text-[12px] text-slate-400 mt-1">
                    Tu agenda está habilitada y tus clientes pueden reservar sin límites.
                  </div>

                  <div className="mt-4">
                    <div className="w-full text-center px-4 py-2 rounded-2xl bg-emerald-400/90 text-slate-950 font-semibold">
                      Administrar plan
                    </div>
                    <div className="text-[11px] text-slate-400 mt-2">
                      • Sin permanencia · Cancelás cuando quieras
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl shadow p-5">
                  <div className="text-slate-100 font-semibold">Link público</div>
                  <div className="text-[12px] text-slate-400 mt-1">
                    Copiá este link y compartilo con tus clientes.
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded-2xl border border-white/10 bg-white/5 text-[12px] text-slate-200 truncate">
                      {data.publicLink}
                    </div>
                    <div className="px-4 py-2 rounded-2xl bg-sky-300/90 text-slate-950 text-[12px] font-semibold">
                      Copiar
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Nota: preview */}
            <div className="mt-5 text-[11px] text-slate-500">
              Vista previa del panel (datos de ejemplo).
            </div>
          </main>
        </div>
      </div>

      {/* Sombra/Glow externo suave para que “flote” en el home */}
      <div className="pointer-events-none -z-10 relative">
        <div className="absolute -inset-10 bg-sky-500/10 blur-3xl rounded-[40px]" />
      </div>
    </div>
  );
}

/* Subcomponentes preview */

function SideItem({ children, active }) {
  return (
    <div
      className={`px-4 py-2 rounded-2xl text-[13px] border transition ${
        active
          ? "bg-white/5 border-white/10 text-slate-100"
          : "bg-transparent border-transparent text-slate-300/90"
      }`}
    >
      {children}
    </div>
  );
}

function MetricCard({ label, value, pill, sublabel }) {
  return (
    <div className="rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl shadow p-5">
      <div className="flex items-start justify-between">
        <div className="text-[12px] text-slate-400">{label}</div>
        <span className="text-[11px] px-2 py-1 rounded-2xl border border-white/10 bg-white/5 text-slate-200">
          {pill}
        </span>
      </div>

      <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
      <div className="text-[12px] text-slate-400 mt-1">{sublabel}</div>
    </div>
  );
}
