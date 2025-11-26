import { useEffect, useState } from "react";
// Si ya tenés supabaseClient, esto no rompe nada aunque no lo uses mucho
import { supabase } from "../supabaseClient";

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);

  // Si más adelante querés traer datos reales, usamos este efecto
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // 👇 Ejemplo de estructura para cuando queramos conectar todo:
        // const {
        //   data: { user },
        // } = await supabase.auth.getUser();
        // if (!user) return;
        // const { data: businesses } = await supabase
        //   .from("businesses")
        //   .select("*")
        //   .eq("owner_id", user.id);
        // console.log("businesses", businesses);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {/* Layout principal */}
      <div className="flex h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 gap-4">
        {/* Sidebar tipo Apple */}
        <aside className="hidden md:flex flex-col w-60 rounded-3xl bg-slate-900/70 border border-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl p-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center text-slate-950 font-semibold text-xl">
              R
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Ritto</p>
              <p className="text-[11px] text-slate-400 tracking-tight">
                Agenda inteligente
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 text-sm">
            <SidebarItem label="Resumen" active />
            <SidebarItem label="Agenda" />
            <SidebarItem label="Servicios" />
            <SidebarItem label="Empleados" />
            <SidebarItem label="Clientes" />
            <SidebarItem label="Ajustes" />
          </nav>

          <div className="mt-4 pt-3 border-t border-white/5">
            <p className="text-[11px] text-slate-500 mb-1">
              Plan actual
            </p>
            <p className="text-xs font-medium flex items-center justify-between">
              <span>Prueba gratuita</span>
              <span className="text-emerald-400 text-[11px]">
                30 días
              </span>
            </p>
          </div>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 flex flex-col gap-4">
          {/* Top bar */}
          <header className="rounded-3xl bg-slate-900/70 border border-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-400 uppercase tracking-[0.18em]">
                Panel de control
              </p>
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
                Bienvenido a tu agenda, <span className="text-emerald-400">Ritto</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button className="hidden sm:inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Agenda online activa</span>
              </button>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-xs font-medium">
                R
              </div>
            </div>
          </header>

          {/* Cards de métricas */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              label="Turnos de hoy"
              value="18"
              sublabel="+5 vs ayer"
              pill="Agenda"
            />
            <MetricCard
              label="Ausencias este mes"
              value="3"
              sublabel="-2 vs mes pasado"
              pill="No-shows"
            />
            <MetricCard
              label="Ingresos estimados"
              value="$ 42.500"
              sublabel="Servicios agendados"
              pill="Ingresos"
            />
            <MetricCard
              label="Ocupación"
              value="86%"
              sublabel="Promedio diario"
              pill="Capacidad"
            />
          </section>

          {/* Grilla principal: agenda + resumen derecha */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
            {/* Agenda de hoy */}
            <div className="lg:col-span-2 rounded-3xl bg-slate-900/70 border border-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-2xl p-4 sm:p-5 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">
                    Turnos de hoy
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Vista rápida de tu día
                  </p>
                </div>
                <button className="text-[11px] px-2.5 py-1 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                  Ver agenda completa
                </button>
              </div>

              <div className="mt-2 flex-1 rounded-2xl border border-white/5 bg-gradient-to-b from-slate-900/60 to-slate-950/80 overflow-hidden">
                <div className="grid grid-cols-[auto,1fr] text-[11px] border-b border-white/5 bg-slate-900/80">
                  <div className="px-3 py-2 text-slate-400 border-r border-white/5">
                    Hora
                  </div>
                  <div className="px-3 py-2 text-slate-400">
                    Cliente · Servicio · Estado
                  </div>
                </div>
                <div className="max-h-[260px] overflow-auto text-[12px]">
                  {FAKE_APPOINTMENTS.map((item) => (
                    <div
                      key={item.time + item.client}
                      className="grid grid-cols-[auto,1fr] border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors"
                    >
                      <div className="px-3 py-2.5 border-r border-white/5 text-slate-300 whitespace-nowrap">
                        {item.time}
                      </div>
                      <div className="px-3 py-2.5 flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-50">
                            {item.client}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {item.service}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] px-2 py-1 rounded-2xl border ${
                            item.status === "Confirmado"
                              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                              : item.status === "Pendiente"
                              ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                              : "border-rose-500/60 bg-rose-500/10 text-rose-300"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna lateral derecha */}
            <div className="flex flex-col gap-4">
              {/* Estado de suscripción */}
              <div className="rounded-3xl bg-slate-900/70 border border-emerald-500/40 shadow-[0_18px_60px_rgba(16,185,129,0.25)] backdrop-blur-xl p-4">
                <p className="text-[11px] text-emerald-300 mb-1 font-medium">
                  Prueba gratuita activa
                </p>
                <h2 className="text-sm font-semibold tracking-tight mb-1.5">
                  30 días para enamorarte de Ritto
                </h2>
                <p className="text-[11px] text-slate-300 mb-3">
                  Usá la agenda sin límites. Al terminar la prueba, solo{" "}
                  <span className="font-semibold">$690 / mes</span> para seguir
                  recibiendo turnos 24/7 de forma automática.
                </p>
                <button className="w-full text-xs px-3 py-2 rounded-2xl bg-emerald-400 text-slate-950 font-semibold hover:bg-emerald-300 transition-colors">
                  Configurar método de pago
                </button>
                <p className="mt-2 text-[10px] text-emerald-100/80">
                  • Sin permanencia · Cancelás cuando quieras
                </p>
              </div>

              {/* Servicios más reservados */}
              <div className="rounded-3xl bg-slate-900/70 border border-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold tracking-tight">
                    Servicios top
                  </h2>
                  <span className="text-[11px] text-slate-400">
                    Últimos 30 días
                  </span>
                </div>
                <div className="space-y-2 text-[12px]">
                  {TOP_SERVICES.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-50">{s.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {s.duration} · ${s.price}
                        </p>
                      </div>
                      <span className="text-[11px] px-2 py-1 rounded-2xl border border-white/10 bg-white/5">
                        {s.count} turnos
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bloques rápidos */}
              <div className="rounded-3xl bg-slate-900/70 border border-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl p-3.5">
                <p className="text-[11px] text-slate-400 mb-2">
                  Atajos rápidos
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <QuickAction label="Crear servicio" />
                  <QuickAction label="Bloquear horario" />
                  <QuickAction label="Ver link público" />
                  <QuickAction label="Configurar horarios" />
                </div>
              </div>
            </div>
          </section>

          {isLoading && (
            <div className="fixed inset-x-0 bottom-4 flex justify-center">
              <div className="px-3 py-1.5 rounded-full bg-slate-900/90 border border-white/10 text-[11px] text-slate-200 shadow-lg">
                Cargando datos de tu negocio...
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ label, active }) {
  return (
    <button
      className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl transition-colors text-xs ${
        active
          ? "bg-white/10 text-slate-50"
          : "text-slate-300 hover:bg-white/5"
      }`}
    >
      <span>{label}</span>
      {active && (
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" />
      )}
    </button>
  );
}

function MetricCard({ label, value, sublabel, pill }) {
  return (
    <div className="rounded-3xl bg-slate-900/70 border border-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl p-3.5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-400">{label}</p>
        <span className="text-[10px] px-2 py-0.5 rounded-2xl border border-white/10 bg-white/5 text-slate-200">
          {pill}
        </span>
      </div>
      <p className="text-xl font-semibold tracking-tight">{value}</p>
      <p className="text-[11px] text-slate-400">{sublabel}</p>
    </div>
  );
}

function QuickAction({ label }) {
  return (
    <button className="w-full px-2.5 py-1.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-left">
      {label}
    </button>
  );
}

// Datos fake para que se vea lindo mientras después enchufamos la BD
const FAKE_APPOINTMENTS = [
  {
    time: "10:00",
    client: "Juan Pérez",
    service: "Corte + Barba",
    status: "Confirmado",
  },
  {
    time: "10:30",
    client: "María López",
    service: "Color completo",
    status: "Pendiente",
  },
  {
    time: "11:15",
    client: "Carlos Gómez",
    service: "Corte clásico",
    status: "Confirmado",
  },
  {
    time: "12:00",
    client: "Ana Silva",
    service: "Peinado evento",
    status: "Cancelado",
  },
  {
    time: "13:30",
    client: "Luis Fernández",
    service: "Corte + Diseño",
    status: "Confirmado",
  },
];

const TOP_SERVICES = [
  { name: "Corte clásico", duration: "30 min", price: "650", count: 42 },
  { name: "Corte + Barba", duration: "45 min", price: "890", count: 31 },
  { name: "Color completo", duration: "60 min", price: "1.500", count: 18 },
];
