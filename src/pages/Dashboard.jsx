import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);

  const [appointmentsToday, setAppointmentsToday] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [noShowsThisMonth, setNoShowsThisMonth] = useState(0);
  const [occupation, setOccupation] = useState(0);
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);

  const [business, setBusiness] = useState(null);

  const navigate = useNavigate();

  // ─────────────────────────────
  // ACCIONES (BOTONES) - NUEVO
  // ─────────────────────────────
  const goAgenda = () => navigate("/schedule");
  const goServices = () => navigate("/services");
  const goBookings = () => navigate("/bookings");
  const goSetup = () => navigate("/setup");
  const goScheduleBlocks = () => navigate("/schedule-blocks");

  // ─────────────────────────────
  // LINK PÚBLICO (CORREGIDO)
  // - antes abría /book/:slug directo
  // - ahora genera /:slug y permite copiar/abrir
  // ─────────────────────────────
  const publicUrl = business?.slug
    ? `${window.location.origin}/${business.slug}`
    : null;

  const copyPublicLink = async () => {
    if (!publicUrl) {
      toast.error("Tu negocio todavía no tiene link público.");
      return;
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copiado");
    } catch (e) {
      console.error("Clipboard error:", e);
      toast.error("No se pudo copiar el link");
    }
  };

  const openPublicLink = () => {
    if (!publicUrl) {
      toast.error("Tu negocio todavía no tiene link público.");
      return;
    }
    window.open(publicUrl, "_blank");
  };

  const comingSoon = (label = "Esta sección") => {
    toast(label + " todavía no está disponible. Próximamente.");
  };

  const configurePayment = () => {
    // No existe todavía pantalla de pago en tu router, así que no rompo nada.
    // Cuando tengas /billing o similar, lo conecto.
    toast("Pagos: próximamente. Por ahora se configura desde Ajustes.");
    navigate("/setup");
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);

      // ─────────────────────────────
      // 1) USUARIO ACTUAL
      // ─────────────────────────────
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setIsLoading(false);
        navigate("/login");
        return;
      }

      const user = session.user;

      // ─────────────────────────────
      // 2) NEGOCIO DEL DUEÑO
      // ─────────────────────────────
      const { data: biz, error: bizError, status: bizStatus } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle(); // evita tirar error si no hay fila

      if (bizError) {
        console.error("Error cargando business:", bizError, "status:", bizStatus);
      }

      if (!biz) {
        toast.error("No se encontró tu negocio. Revisá la configuración.");
        setIsLoading(false);
        return;
      }

      setBusiness(biz);

      const todayStr = new Date().toISOString().slice(0, 10);
      const monthStart = todayStr.slice(0, 7) + "-01";

      // ─────────────────────────────
      // 3) SERVICIOS DEL NEGOCIO
      // ─────────────────────────────
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, price, duration")
        .eq("business_id", biz.id);

      if (servicesError) {
        console.error("Error cargando services:", servicesError);
      }

      const servicesMap = new Map();
      (servicesData || []).forEach((s) => servicesMap.set(s.id, s));

      // ─────────────────────────────
      // 4) TURNOS DE HOY
      // ─────────────────────────────
      const { data: bookingsToday, error: bookingsTodayError } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", biz.id)
        .eq("date", todayStr)
        .order("hour", { ascending: true });

      if (bookingsTodayError) {
        console.error("Error cargando bookingsToday:", bookingsTodayError);
      }

      setAppointmentsToday(bookingsToday || []);

      // ─────────────────────────────
      // 5) NO-SHOWS DEL MES
      // ─────────────────────────────
      const { data: noShows, error: noShowsError } = await supabase
        .from("bookings")
        .select("id")
        .eq("business_id", biz.id)
        .eq("status", "no_show")
        .gte("date", monthStart);

      if (noShowsError) {
        console.error("Error cargando noShows:", noShowsError);
      }

      setNoShowsThisMonth(noShows?.length || 0);

      // ─────────────────────────────
      // 6) ÚLTIMOS 30 DÍAS
      // ─────────────────────────────
      const date30 = new Date(Date.now() - 30 * 86400000)
        .toISOString()
        .slice(0, 10);

      const { data: recentBookings, error: recentBookingsError } =
        await supabase
          .from("bookings")
          .select("service_id, service_name, status")
          .eq("business_id", biz.id)
          .gte("date", date30)
          .lte("date", todayStr);

      if (recentBookingsError) {
        console.error("Error cargando recentBookings:", recentBookingsError);
      }

      // ─────────────────────────────
      // 7) TOP SERVICIOS
      // ─────────────────────────────
      const counts = {};
      (recentBookings || []).forEach((b) => {
        const key = b.service_id || b.service_name;
        counts[key] = (counts[key] || 0) + 1;
      });

      const top = Object.entries(counts)
        .map(([id, count]) => {
          const service =
            servicesMap.get(id) ||
            (servicesData || []).find((s) => s.name === id);

          return {
            id,
            name: service?.name || id,
            duration: service?.duration,
            price: service?.price,
            count,
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setTopServices(top);

      // ─────────────────────────────
      // 8) INGRESOS ÚLTIMOS 30 DÍAS
      // ─────────────────────────────
      let totalRev = 0;

      (recentBookings || [])
        .filter((b) => b.status === "confirmed")
        .forEach((b) => {
          const svc = servicesMap.get(b.service_id);
          totalRev += Number(svc?.price) || 0;
        });

      setEstimatedRevenue(totalRev);

      // ─────────────────────────────
      // 9) OCUPACIÓN DE HOY
      // ─────────────────────────────
      const occupationValue = await calculateOccupation(biz.id, todayStr, biz);
      setOccupation(occupationValue);
    } catch (err) {
      console.error("Dashboard error", err);
      toast.error("Hubo un problema cargando el panel.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateOccupation = async (businessId, dateStr, biz) => {
    try {
      const dayName = new Date(dateStr)
        .toLocaleDateString("es-UY", { weekday: "long" })
        .toLowerCase();

      const { data: schedules, error: schedulesError } = await supabase
        .from("schedules")
        .select("*")
        .eq("business_id", businessId);

      if (schedulesError) {
        console.error("Error cargando schedules:", schedulesError);
        return 0;
      }

      const todays = (schedules || []).filter(
        (s) => (s.day_of_week || "").toLowerCase() === dayName
      );

      if (!todays.length) return 0;

      const interval = biz.slot_interval_minutes || 30;
      let totalSlots = 0;

      todays.forEach((s) => {
        let curr = s.start_time.slice(0, 5);
        const end = s.end_time.slice(0, 5);

        while (curr < end) {
          totalSlots += s.capacity_per_slot || 1;
          curr = addMinutes(curr, interval);
        }
      });

      if (totalSlots === 0) return 0;

      const { data: used, error: usedError } = await supabase
        .from("bookings")
        .select("id")
        .eq("business_id", businessId)
        .eq("date", dateStr)
        .eq("status", "confirmed");

      if (usedError) {
        console.error("Error cargando used slots:", usedError);
        return 0;
      }

      return Math.round(((used?.length || 0) / totalSlots) * 100);
    } catch (e) {
      console.error("calculateOccupation error", e);
      return 0;
    }
  };

  const addMinutes = (time, mins) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h);
    d.setMinutes(m + Number(mins));
    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  };

  const revenueLabel = new Intl.NumberFormat("es-UY").format(
    estimatedRevenue || 0
  );

  const occupationLabel = `${occupation || 0}%`;

  // ─────────────────────────────
  // LÓGICA DE PLAN / TRIAL SEGÚN TU TABLA REAL
  // ─────────────────────────────
  const today = new Date();
  const trialEndsDate = business?.trial_ends_at
    ? new Date(business.trial_ends_at)
    : null;

  const msDiff =
    trialEndsDate && !Number.isNaN(trialEndsDate.getTime())
      ? trialEndsDate.getTime() - today.getTime()
      : null;

  const daysLeft =
    msDiff !== null ? Math.ceil(msDiff / (1000 * 60 * 60 * 24)) : null;

  const subscription = business?.subscription_status || null;
  const isLifetime = subscription === "lifetime_free";
  const isTrial = subscription === "trial";
  const trialActive = isTrial && daysLeft !== null && daysLeft > 0;
  const trialExpired = isTrial && daysLeft !== null && daysLeft <= 0;

  // Loader inicial si todavía está cargando y no hay negocio
  if (isLoading && !business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-900">
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-black text-4xl font-extrabold animate-pulse shadow-xl">
            R
          </div>
          <p className="text-white/80 animate-pulse">Cargando tu panel...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-900 text-slate-50 flex relative">
      {/* Overlay solo si el trial terminó y NO es lifetime */}
      {trialExpired && !isLifetime && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-xl">
          <div className="max-w-sm w-full bg-slate-900/90 border border-emerald-400/40 rounded-3xl p-6 text-center shadow-[0_18px_60px_rgba(16,185,129,0.4)]">
            <p className="text-sm font-semibold mb-2">
              Tu prueba gratuita finalizó
            </p>
            <p className="text-xs text-slate-300 mb-4">
              Para seguir usando Ritto y que tus clientes puedan reservar,
              activá tu plan por{" "}
              <span className="font-semibold">$690/mes</span>.
            </p>
            <button
              onClick={configurePayment}
              className="w-full text-xs px-3 py-2 rounded-2xl bg-emerald-400 text-slate-950 font-semibold hover:bg-emerald-300 transition"
            >
              Activar plan ahora
            </button>
            <p className="text-[10px] text-slate-400 mt-3">
              Sin permanencia · Cancelás cuando quieras.
            </p>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 px-5 py-6 bg-slate-900/70 border-r border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-300 text-slate-950 font-semibold flex items-center justify-center">
            R
          </div>
          <div>
            <p className="text-sm font-semibold">Ritto</p>
            <p className="text-[11px] text-slate-400">Agenda inteligente</p>
          </div>
        </div>

        <nav className="space-y-1 text-sm flex-1">
          <SidebarItem label="Resumen" active onClick={() => navigate("/dashboard")} />
          <SidebarItem label="Agenda" onClick={() => navigate("/bookings")} />
          <SidebarItem label="Servicios" onClick={() => navigate("/services")} />
          <SidebarItem label="Horarios" onClick={() => navigate("/schedule")} />
          <SidebarItem label="Bloqueos" onClick={() => navigate("/schedule-blocks")} />
          <SidebarItem label="Ajustes" onClick={() => navigate("/setup")} />
        </nav>

        <div className="mt-6 pt-4 border-t border-white/10 text-[11px]">
          <p className="text-slate-500 mb-1">Plan actual</p>

          {business && (
            <>
              {isLifetime && (
                <div className="flex items-center justify-between">
                  <span className="text-xs">Acceso de por vida</span>
                  <span className="text-cyan-300 font-medium">Lifetime</span>
                </div>
              )}

              {trialActive && (
                <div className="flex items-center justify-between">
                  <span className="text-xs">Prueba gratuita</span>
                  <span className="text-emerald-400 font-medium">
                    {daysLeft} días restantes
                  </span>
                </div>
              )}

              {trialExpired && !isLifetime && (
                <div className="flex items-center justify-between">
                  <span className="text-xs">Prueba finalizada</span>
                  <span className="text-rose-400 font-medium">Bloqueado</span>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-5 md:p-8 flex flex-col gap-6">
        {/* HEADER */}
        <header className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-[0.18em]">
              Panel de control
            </p>
            <h1 className="text-xl font-semibold">
              Bienvenido,{" "}
              <span className="text-emerald-400">
                {business?.name || "Ritto"}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={trialExpired && !isLifetime ? configurePayment : goAgenda}
              className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10"
            >
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              {trialExpired && !isLifetime ? "Agenda bloqueada" : "Agenda activa"}
            </button>

            <div className="h-10 w-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
              {business?.name?.[0] || "R"}
            </div>
          </div>
        </header>

        {/* MÉTRICAS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard
            label="Turnos de hoy"
            value={appointmentsToday.length}
            pill="Agenda"
            sublabel="Reservas del día"
          />
          <MetricCard
            label="Ausencias"
            value={noShowsThisMonth}
            pill="No-shows"
            sublabel="Mes actual"
          />
          <MetricCard
            label="Ingresos"
            value={`$ ${revenueLabel}`}
            pill="Ingresos"
            sublabel="Últimos 30 días"
          />
          <MetricCard
            label="Ocupación"
            value={occupationLabel}
            pill="Capacidad"
            sublabel="Hoy"
          />
        </section>

        {/* AGENDA + LATERAL */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          {/* AGENDA HOY */}
          <div className="lg:col-span-2 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold">Turnos de hoy</h2>
                <p className="text-[11px] text-slate-400">Vista rápida</p>
              </div>
              <button
                onClick={goAgenda}
                className="text-[11px] px-3 py-1 rounded-2xl bg-white/5 border border-white/10"
              >
                Ver agenda completa
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden">
              <div className="grid grid-cols-[auto,1fr] text-[11px] border-b border-white/10 bg-slate-900/70">
                <div className="px-3 py-2 text-slate-400 border-r border-white/10">
                  Hora
                </div>
                <div className="px-3 py-2 text-slate-400">
                  Cliente · Servicio · Estado
                </div>
              </div>

              <div className="max-h-[260px] overflow-auto text-[12px]">
                {appointmentsToday.length === 0 && (
                  <div className="px-4 py-6 text-slate-500 text-sm">
                    Todavía no tenés turnos hoy.
                  </div>
                )}

                {appointmentsToday.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[auto,1fr] border-b border-white/10 hover:bg-white/5"
                  >
                    <div className="px-3 py-2.5 border-r border-white/10 text-slate-200">
                      {item.hour?.slice(0, 5) || "--:--"}
                    </div>

                    <div className="px-3 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-50">
                          {item.customer_name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.service_name}
                        </p>
                      </div>

                      <span
                        className={`text-[11px] px-2 py-1 rounded-2xl border ${
                          item.status === "confirmed"
                            ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                            : item.status === "pending"
                            ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                            : item.status === "no_show"
                            ? "border-rose-500/60 bg-rose-500/10 text-rose-300"
                            : item.status === "cancelled"
                            ? "border-slate-500/60 bg-slate-500/10 text-slate-300"
                            : "border-slate-500/60 bg-slate-500/10 text-slate-200"
                        }`}
                      >
                        {item.status === "confirmed"
                          ? "Confirmado"
                          : item.status === "pending"
                          ? "Pendiente"
                          : item.status === "cancelled"
                          ? "Cancelado"
                          : item.status === "no_show"
                          ? "No-show"
                          : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* LATERAL */}
          <div className="flex flex-col gap-6">
            {/* PLAN */}
            <div className="rounded-3xl bg-slate-900/70 border border-emerald-500/40 backdrop-blur-xl shadow-[0_18px_60px_rgba(16,185,129,0.25)] p-5">
              {isLifetime && (
                <>
                  <p className="text-[11px] text-cyan-300">Acceso de por vida</p>
                  <h2 className="text-sm font-semibold mt-1">
                    Gracias por ser parte de la familia Ritto
                  </h2>
                  <p className="text-[12px] text-slate-300 mt-2">
                    Tu cuenta está liberada para siempre por usar el código{" "}
                    <span className="font-semibold">lafamiliaspinelli</span>.
                  </p>
                </>
              )}

              {isTrial && !trialExpired && (
                <>
                  <p className="text-[11px] text-emerald-300">
                    Prueba gratuita activa
                  </p>
                  <h2 className="text-sm font-semibold mt-1">
                    {daysLeft} días para enamorarte de Ritto
                  </h2>
                  <p className="text-[12px] text-slate-300 mt-2">
                    Usá la agenda sin límites. Después solo{" "}
                    <span className="font-semibold">$690/mes</span>.
                  </p>
                </>
              )}

              {!isLifetime && !isTrial && (
                <>
                  <p className="text-[11px] text-emerald-300">Plan activo</p>
                  <h2 className="text-sm font-semibold mt-1">
                    Estás usando Ritto sin restricciones
                  </h2>
                  <p className="text-[12px] text-slate-300 mt-2">
                    Podés gestionar turnos, servicios y horarios sin límites.
                  </p>
                </>
              )}

              {!isLifetime && (
                <button
                  onClick={configurePayment}
                  className="w-full text-xs px-3 py-2 rounded-2xl bg-emerald-400 text-slate-950 font-semibold hover:bg-emerald-300 mt-3 transition"
                >
                  Configurar método de pago
                </button>
              )}

              <p className="text-[10px] text-emerald-100/80 mt-2">
                • Sin permanencia · Cancelás cuando quieras
              </p>
            </div>

            {/* TOP SERVICIOS */}
            <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Servicios top</h2>
                <span className="text-[11px] text-slate-500">
                  Últimos 30 días
                </span>
              </div>

              {topServices.length === 0 ? (
                <p className="text-[12px] text-slate-400">
                  No hay suficientes datos todavía.
                </p>
              ) : (
                <div className="space-y-3 text-[12px]">
                  {topServices.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-slate-50">{s.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {s.duration ? `${s.duration} min` : ""}{" "}
                          {s.price ? `· $${s.price}` : ""}
                        </p>
                      </div>

                      <span className="text-[11px] px-2 py-1 rounded-2xl border border-white/10 bg-white/5">
                        {s.count} turnos
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* LINK PÚBLICO (NUEVO) */}
            <div className="rounded-3xl bg-slate-900/70 border border-cyan-400/30 backdrop-blur-xl shadow-[0_18px_60px_rgba(56,189,248,0.25)] p-5">
              <p className="text-[11px] text-cyan-300 mb-1">Link público</p>

              <p className="text-[12px] text-slate-300 mb-3">
                Copiá este link y compartilo con tus clientes.
              </p>

              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={publicUrl || "Generando link..."}
                  className="flex-1 text-[11px] px-3 py-2 rounded-2xl bg-slate-950 border border-white/10 text-slate-200 select-all"
                />

                <button
                  onClick={copyPublicLink}
                  className="text-[11px] px-3 py-2 rounded-2xl bg-cyan-400 text-slate-950 font-semibold hover:bg-cyan-300 transition"
                >
                  Copiar
                </button>
              </div>

              <button
                onClick={openPublicLink}
                className="mt-3 text-[11px] w-full px-3 py-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
              >
                Abrir link público
              </button>
            </div>

            {/* QUICK ACTIONS */}
            <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-4">
              <p className="text-[11px] text-slate-400 mb-2">Atajos rápidos</p>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <QuickAction label="Crear servicio" onClick={goServices} />
                <QuickAction label="Bloquear horario" onClick={goScheduleBlocks} />
                {/* ELIMINADO: Ver link público (antes abría /book/:slug) */}
                <QuickAction label="Configurar horarios" onClick={goSetup} />
              </div>
            </div>
          </div>
        </section>

        {/* LOADING CHIP */}
        {isLoading && (
          <div className="fixed bottom-5 inset-x-0 flex justify-center pointer-events-none">
            <div className="px-4 py-2 bg-slate-900/80 border border-white/10 rounded-full text-[11px]">
              Cargando datos...
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* COMPONENTES */

function SidebarItem({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs transition ${
        active
          ? "bg-white/10 text-slate-50 shadow-inner"
          : "text-slate-300 hover:bg-white/5"
      }`}
    >
      {label}
      {active && <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />}
    </button>
  );
}

function MetricCard({ label, value, sublabel, pill }) {
  return (
    <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-slate-400">{label}</p>
        <span className="text-[10px] px-2 py-0.5 rounded-2xl border border-white/10 bg-white/5">
          {pill}
        </span>
      </div>

      <p className="text-2xl font-semibold mt-1">{value}</p>
      <p className="text-[11px] text-slate-500">{sublabel}</p>
    </div>
  );
}

function QuickAction({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-left transition"
    >
      {label}
    </button>
  );
}
