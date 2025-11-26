import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);

  const [appointmentsToday, setAppointmentsToday] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [noShowsThisMonth, setNoShowsThisMonth] = useState(0);
  const [occupation, setOccupation] = useState(0);
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);

  const [business, setBusiness] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);

      // 1) Usuario actual
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error(userError);
        return;
      }

      // 2) Negocio del usuario
      const { data: biz, error: bizError } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (bizError || !biz) {
        console.error(bizError);
        return;
      }

      setBusiness(biz);

      // Fechas base
      const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const monthStart = todayStr.slice(0, 7) + "-01";
      const date30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      // 3) Servicios del negocio (para precios/duración)
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, price, duration")
        .eq("business_id", biz.id);

      if (servicesError) {
        console.error(servicesError);
      }

      const servicesMap = new Map();
      (servicesData || []).forEach((s) => {
        servicesMap.set(s.id, s);
      });

      // 4) Turnos de HOY
      const { data: bookingsToday, error: bookingsTodayError } =
        await supabase
          .from("bookings")
          .select("*")
          .eq("business_id", biz.id)
          .eq("date", todayStr)
          .order("hour", { ascending: true });

      if (bookingsTodayError) {
        console.error(bookingsTodayError);
      }

      setAppointmentsToday(bookingsToday || []);

      // 5) No-shows del MES
      const { data: noShows, error: noShowsError } = await supabase
        .from("bookings")
        .select("id")
        .eq("business_id", biz.id)
        .eq("status", "no_show")
        .gte("date", monthStart)
        .lte("date", todayStr);

      if (noShowsError) {
        console.error(noShowsError);
      }

      setNoShowsThisMonth(noShows?.length || 0);

      // 6) Bookings últimos 30 días
      const { data: recentBookings, error: recentError } = await supabase
        .from("bookings")
        .select("service_id, service_name, status")
        .eq("business_id", biz.id)
        .gte("date", date30)
        .lte("date", todayStr);

      if (recentError) {
        console.error(recentError);
      }

      // Top servicios (contar por service_id)
      const countByService = {};
      (recentBookings || []).forEach((b) => {
        const key = b.service_id || b.service_name;
        if (!key) return;
        countByService[key] = (countByService[key] || 0) + 1;
      });

      const top = Object.entries(countByService)
        .map(([key, count]) => {
          let svc = null;
          if (typeof key === "string") {
            // puede ser id o nombre, probamos ambas
            svc =
              servicesMap.get(key) ||
              (servicesData || []).find((s) => s.name === key) ||
              null;
          }
          return {
            id: svc?.id || key,
            name: svc?.name || key || "Servicio",
            duration: svc?.duration || null,
            price: svc?.price || null,
            count,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setTopServices(top);

      // 7) Ingresos estimados (últimos 30 días, solo confirmados)
      let totalRevenue = 0;
      (recentBookings || [])
        .filter((b) => b.status === "confirmed")
        .forEach((b) => {
          const svc =
            servicesMap.get(b.service_id) ||
            (servicesData || []).find((s) => s.name === b.service_name);
          const price = Number(svc?.price) || 0;
          totalRevenue += price;
        });

      setEstimatedRevenue(totalRevenue);

      // 8) Ocupación del día
      const occupationValue = await calculateOccupation(biz.id, todayStr, biz);
      setOccupation(occupationValue);
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------
  // CÁLCULO OCUPACIÓN
  // ---------------------------
  const calculateOccupation = async (businessId, todayStr, biz) => {
    try {
      const dayName = new Date(todayStr)
        .toLocaleDateString("es-UY", { weekday: "long" })
        .toLowerCase();

      const { data: schedules, error: schedulesError } = await supabase
        .from("schedules")
        .select("*")
        .eq("business_id", businessId);

      if (schedulesError || !schedules || schedules.length === 0) return 0;

      const todays = schedules.filter(
        (s) => (s.day_of_week || "").toLowerCase() === dayName
      );

      if (todays.length === 0) return 0;

      const interval =
        Number(biz?.slot_interval_minutes) && biz.slot_interval_minutes > 0
          ? Number(biz.slot_interval_minutes)
          : 30;

      let totalCapacity = 0;

      todays.forEach((s) => {
        const start = s.start_time.slice(0, 5);
        const end = s.end_time.slice(0, 5);
        let curr = start;

        while (curr < end) {
          totalCapacity += s.capacity_per_slot || 1;
          curr = addMinutes(curr, interval);
        }
      });

      if (totalCapacity === 0) return 0;

      const { data: confirmed, error: confirmedError } = await supabase
        .from("bookings")
        .select("id")
        .eq("business_id", businessId)
        .eq("date", todayStr)
        .eq("status", "confirmed");

      if (confirmedError) return 0;

      const used = confirmed?.length || 0;
      return Math.max(0, Math.min(100, Math.round((used / totalCapacity) * 100)));
    } catch (err) {
      console.error("Error ocupación:", err);
      return 0;
    }
  };

  const addMinutes = (time, mins) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h);
    d.setMinutes(m + Number(mins));
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const formattedRevenue = new Intl.NumberFormat("es-UY").format(
    Number(estimatedRevenue) || 0
  );

  const occupationLabel =
    occupation && !Number.isNaN(occupation) ? `${occupation}%` : "0%";

  // -------------------------------------------------------------
  // UI (MISMO LOOK APPLE PRO MAX QUE YA TENÍAMOS)
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-slate-50 flex">
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col w-64 px-5 py-6 shadow-[0_18px_60px_rgba(0,0,0,0.55)]
        bg-slate-900/70 border-r border-white/10 backdrop-blur-2xl
        animate-fadeIn"
      >
        <div className="flex items-center gap-3 mb-10 pl-1">
          <div
            className="h-10 w-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-400 
            flex items-center justify-center text-slate-950 font-semibold text-xl shadow-inner"
          >
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

        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="text-[11px] text-slate-500 mb-1">Plan actual</p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Prueba gratuita</span>
            <span className="text-emerald-400 text-[11px]">30 días</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 flex flex-col gap-6 animate-fadeIn">
        {/* Header */}
        <header
          className="rounded-3xl bg-slate-900/70 border border-white/10
          shadow-[0_18px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl 
          px-6 py-5 flex items-center justify-between"
        >
          <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-[0.18em]">
              Panel de control
            </p>
            <h1 className="text-xl font-semibold tracking-tight">
              Bienvenido a tu agenda,{" "}
              <span className="text-emerald-400">
                {business?.name || "Ritto"}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="hidden sm:inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-2xl
              border border-white/10 bg-white/5 hover:bg-white/10 
              transition-all duration-300 backdrop-blur-md shadow-inner"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Agenda online activa</span>
            </button>

            <div
              className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 
              border border-white/10 flex items-center justify-center text-xs font-medium"
            >
              {business?.name ? business.name[0]?.toUpperCase() : "R"}
            </div>
          </div>
        </header>

        {/* Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Turnos de hoy"
            value={String(appointmentsToday.length || 0)}
            sublabel="Reservas para la fecha actual"
            pill="Agenda"
          />
          <MetricCard
            label="Ausencias este mes"
            value={String(noShowsThisMonth || 0)}
            sublabel="Turnos marcados como no-show"
            pill="No-shows"
          />
          <MetricCard
            label="Ingresos estimados"
            value={`$ ${formattedRevenue}`}
            sublabel="Últimos 30 días (confirmados)"
            pill="Ingresos"
          />
          <MetricCard
            label="Ocupación"
            value={occupationLabel}
            sublabel="Capacidad utilizada hoy"
            pill="Capacidad"
          />
        </section>

        {/* Main grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          {/* Agenda de hoy */}
          <div
            className="lg:col-span-2 rounded-3xl bg-slate-900/70
            border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.6)]
            backdrop-blur-2xl p-5 flex flex-col animate-fadeUp"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">
                  Turnos de hoy
                </h2>
                <p className="text-[11px] text-slate-400">
                  Vista rápida de tu día
                </p>
              </div>
              <button
                className="text-[11px] px-3 py-1 rounded-2xl border border-white/10 
                bg-white/5 hover:bg-white/10 transition-all"
              >
                Ver agenda completa
              </button>
            </div>

            <div
              className="rounded-2xl border border-white/10 
              bg-gradient-to-b from-slate-900/50 to-slate-950/80 overflow-hidden"
            >
              <div className="grid grid-cols-[auto,1fr] text-[11px] border-b border-white/10 bg-slate-900/70">
                <div className="px-3 py-2 text-slate-400 border-r border-white/10">
                  Hora
                </div>
                <div className="px-3 py-2 text-slate-400">
                  Cliente · Servicio · Estado
                </div>
              </div>

              {appointmentsToday.length === 0 ? (
                <div className="px-4 py-6 text-[12px] text-slate-400">
                  Hoy todavía no tenés turnos agendados.
                </div>
              ) : (
                <div className="max-h-[260px] overflow-auto text-[12px]">
                  {appointmentsToday.map((item) => {
                    const time = item.hour
                      ? item.hour.slice(0, 5)
                      : "--:--";
                    const statusRaw = item.status || "confirmed";
                    let statusLabel = "Confirmado";
                    if (statusRaw === "pending") statusLabel = "Pendiente";
                    if (statusRaw === "cancelled") statusLabel = "Cancelado";
                    if (statusRaw === "no_show") statusLabel = "No-show";

                    const statusClass =
                      statusRaw === "confirmed"
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                        : statusRaw === "pending"
                        ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                        : statusRaw === "no_show"
                        ? "border-rose-500/60 bg-rose-500/10 text-rose-300"
                        : "border-slate-500/60 bg-slate-500/10 text-slate-200";

                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-[auto,1fr] border-b border-white/10 
                        hover:bg-white/5 transition-colors"
                      >
                        <div className="px-3 py-2.5 border-r border-white/10 text-slate-200 whitespace-nowrap">
                          {time}
                        </div>

                        <div className="px-3 py-2.5 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-50">
                              {item.customer_name || "Cliente"}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {item.service_name || "Servicio"}
                            </p>
                          </div>

                          <span
                            className={`text-[11px] px-2 py-1 rounded-2xl border ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6 animate-fadeUp">
            {/* Plan */}
            <div
              className="rounded-3xl bg-slate-900/70 border border-emerald-500/40 
              shadow-[0_18px_60px_rgba(16,185,129,0.25)] backdrop-blur-xl p-5"
            >
              <p className="text-[11px] text-emerald-300 mb-1">
                Prueba gratuita activa
              </p>

              <h2 className="text-sm font-semibold tracking-tight mb-1.5">
                30 días para enamorarte de Ritto
              </h2>

              <p className="text-[12px] text-slate-300 mb-3 leading-relaxed">
                Usá la agenda sin límites. Luego solo{" "}
                <span className="font-semibold">$690/mes</span>.
              </p>

              <button
                className="w-full text-xs px-3 py-2 rounded-2xl 
                bg-emerald-400 text-slate-950 font-semibold hover:bg-emerald-300 transition"
              >
                Configurar método de pago
              </button>

              <p className="mt-2 text-[10px] text-emerald-100/80">
                • Sin permanencia · Cancelás cuando quieras
              </p>
            </div>

            {/* Servicios top */}
            <div
              className="rounded-3xl bg-slate-900/70 border border-white/10 
              shadow-[0_18px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Servicios top</h2>
                <span className="text-[11px] text-slate-500">
                  Últimos 30 días
                </span>
              </div>

              {topServices.length === 0 ? (
                <p className="text-[12px] text-slate-400">
                  Todavía no hay suficientes reservas para calcular
                  servicios top.
                </p>
              ) : (
                <div className="space-y-3 text-[12px]">
                  {topServices.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-50">
                          {s.name}
                        </p>
                        {(s.duration || s.price) && (
                          <p className="text-[11px] text-slate-400">
                            {s.duration
                              ? `${s.duration} min`
                              : "Duración variable"}
                            {s.price
                              ? ` · $${Number(s.price)}`
                              : ""}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] px-2 py-1 rounded-2xl border border-white/10 bg-white/5">
                        {s.count} turnos
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div
              className="rounded-3xl bg-slate-900/70 border border-white/10 
              shadow-[0_18px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl p-4"
            >
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
          <div className="fixed inset-x-0 bottom-5 flex justify-center animate-fadeIn">
            <div
              className="px-4 py-2 rounded-full bg-slate-900/90 border border-white/10
              text-[11px] text-slate-200 shadow-lg"
            >
              Cargando datos de tu negocio...
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* COMPONENTES */

function SidebarItem({ label, active }) {
  return (
    <button
      className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl 
      transition-all text-xs
      ${
        active
          ? "bg-white/10 text-slate-50 shadow-inner"
          : "text-slate-300 hover:bg-white/5"
      }`}
    >
      <span>{label}</span>
      {active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
    </button>
  );
}

function MetricCard({ label, value, sublabel, pill }) {
  return (
    <div
      className="rounded-3xl bg-slate-900/70 border border-white/10 
      shadow-[0_18px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl p-4
      transition-all hover:scale-[1.02] hover:shadow-[0_25px_70px_rgba(0,0,0,0.7)]"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-400">{label}</p>
        <span className="text-[10px] px-2 py-0.5 rounded-2xl border border-white/10 bg-white/5">
          {pill}
        </span>
      </div>

      <p className="text-2xl font-semibold mt-1 tracking-tight">{value}</p>
      <p className="text-[11px] text-slate-500">{sublabel}</p>
    </div>
  );
}

function QuickAction({ label }) {
  return (
    <button
      className="w-full px-3 py-2 rounded-2xl border border-white/10 
      bg-white/5 hover:bg-white/10 transition-all text-left"
    >
      {label}
    </button>
  );
}
