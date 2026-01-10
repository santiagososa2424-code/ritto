import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false);

  const [appointmentsToday, setAppointmentsToday] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [occupation, setOccupation] = useState(0);
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);

  const [business, setBusiness] = useState(null);
  const [copied, setCopied] = useState(false);

  // ─────────────────────────────
  // CALENDARIO (MES) — ÚNICO
  // ─────────────────────────────
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [monthBookings, setMonthBookings] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState("");

  const monthLabel = useMemo(() => {
    try {
      return calendarMonth.toLocaleDateString("es-UY", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }, [calendarMonth]);

  const monthStartStr = useMemo(() => {
    const d = new Date(calendarMonth);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  }, [calendarMonth]);

  const monthEndStr = useMemo(() => {
    const d = new Date(calendarMonth);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().slice(0, 10);
  }, [calendarMonth]);

  const loadMonthBookings = async (bizId, startStr, endStr) => {
    try {
      setCalendarLoading(true);

      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, date, hour, customer_name, service_name, status, transfer_pdf_url"
        )
        .eq("business_id", bizId)
        .gte("date", startStr)
        .lte("date", endStr)
        .order("date", { ascending: true })
        .order("hour", { ascending: true });

      if (error) {
        console.error("Error loadMonthBookings:", error);
        setMonthBookings([]);
        return;
      }

      setMonthBookings(data || []);
    } catch (e) {
      console.error("loadMonthBookings error:", e);
      setMonthBookings([]);
    } finally {
      setCalendarLoading(false);
    }
  };

  useEffect(() => {
    if (!business?.id) return;
    loadMonthBookings(business.id, monthStartStr, monthEndStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id, monthStartStr, monthEndStr]);

  const prevMonth = () => {
    const d = new Date(calendarMonth);
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    setSelectedDay("");
    setCalendarMonth(d);
  };

  const nextMonth = () => {
    const d = new Date(calendarMonth);
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    setSelectedDay("");
    setCalendarMonth(d);
  };

  const monthMap = useMemo(() => {
    const map = {};
    (monthBookings || []).forEach((b) => {
      const key = b.date;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [monthBookings]);

  /* ─────────────────────────────
     HELPERS DE FECHA (FIJOS)
  ───────────────────────────── */
  const todayStr = new Date().toISOString().slice(0, 10);

  const endWeekStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  })();

  const depositEnabled = business?.deposit_enabled === true;

  /* ─────────────────────────────
     NAVEGACIÓN
  ───────────────────────────── */
  const navigate = useNavigate();

  const goAgenda = () => navigate("/schedule");
  const goServices = () => navigate("/services");
  const goBookings = () => navigate("/bookings");
  const goSetup = () => navigate("/setup");
  const goScheduleBlocks = () => navigate("/schedule-blocks");
  const configurePayment = () => navigate("/billing");

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────────────────────────────
     LINK PÚBLICO
  ───────────────────────────── */
  const publicLink = useMemo(() => {
    if (!business?.slug) return "";
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "";
    return `${origin}/book/${business.slug}`;
  }, [business?.slug]);

  const copyPublicLink = async () => {
    if (!publicLink) {
      toast.error("Todavía no hay link público disponible.");
      return;
    }
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopied(true);
      toast.success("Link copiado.");
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      console.error("copyPublicLink error:", e);
      toast.error("No se pudo copiar.");
    }
  };

  const openPublicLink = () => {
    if (!publicLink) {
      toast.error("Todavía no hay link público disponible.");
      return;
    }
    window.open(publicLink, "_blank", "noopener,noreferrer");
  };

  /* ─────────────────────────────
     ACCIONES SEÑA (MINIMAL)
  ───────────────────────────── */
  const openProof = (booking) => {
    const url = booking?.transfer_pdf_url;
    if (!url) {
      toast.error("Este turno no tiene comprobante.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const confirmBooking = async (bookingId) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId);

      if (error) throw error;
      toast.success("Turno confirmado.");
      loadDashboard();
      if (business?.id)
        loadMonthBookings(business.id, monthStartStr, monthEndStr);
    } catch (e) {
      console.error("confirmBooking error:", e);
      toast.error("No se pudo confirmar.");
    }
  };

  const rejectBooking = async (bookingId) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;
      toast.success("Turno rechazado.");
      loadDashboard();
      if (business?.id)
        loadMonthBookings(business.id, monthStartStr, monthEndStr);
    } catch (e) {
      console.error("rejectBooking error:", e);
      toast.error("No se pudo rechazar.");
    }
  };

  /* ─────────────────────────────
     LOAD DASHBOARD (ÚNICO ORIGEN)
  ───────────────────────────── */
  const loadDashboard = async () => {
    try {
      setIsLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login");
        return;
      }

      const user = session.user;

      const { data: biz, error: bizError } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (bizError || !biz) {
        toast.error("No se pudo cargar tu negocio.");
        return;
      }

      setBusiness(biz);

      /* ───────── TURNOS DE LA SEMANA ───────── */
      const { data: bookingsWeek, error: bookingsWeekError } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", biz.id)
        .gte("date", todayStr)
        .lte("date", endWeekStr)
        .order("date", { ascending: true })
        .order("hour", { ascending: true });

      if (bookingsWeekError) {
        console.error("Error bookingsWeek:", bookingsWeekError);
      }

      setAppointmentsToday(bookingsWeek || []);

      /* ───────── SERVICIOS ───────── */
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, price, duration")
        .eq("business_id", biz.id);

      if (servicesError) {
        console.error("Error cargando services:", servicesError);
      }

      const servicesMap = new Map();
      (servicesData || []).forEach((s) => servicesMap.set(s.id, s));

      /* ───────── ÚLTIMOS 30 DÍAS ───────── */
      const date30 = new Date(Date.now() - 30 * 86400000)
        .toISOString()
        .slice(0, 10);

      const { data: recentBookings, error: recentBookingsError } = await supabase
        .from("bookings")
        .select("service_id, service_name, status")
        .eq("business_id", biz.id)
        .gte("date", date30)
        .lte("date", todayStr);

      if (recentBookingsError) {
        console.error("Error cargando recentBookings:", recentBookingsError);
      }

      /* ───────── TOP SERVICIOS ───────── */
      const counts = {};
      (recentBookings || []).forEach((b) => {
        const key = b.service_id || b.service_name;
        counts[key] = (counts[key] || 0) + 1;
      });

      const top = Object.entries(counts)
        .map(([id, count]) => {
          const service =
            servicesMap.get(id) ||
            (servicesData || []).find((s) => String(s.name) === String(id));

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

      /* ───────── INGRESOS ───────── */
      let totalRev = 0;
      (recentBookings || [])
        .filter((b) => b.status === "confirmed")
        .forEach((b) => {
          const svc = servicesMap.get(b.service_id);
          totalRev += Number(svc?.price) || 0;
        });

      setEstimatedRevenue(totalRev);

      /* ───────── OCUPACIÓN HOY ───────── */
      const occupationValue = await calculateOccupation(biz.id, todayStr, biz);
      setOccupation(occupationValue);
    } catch (err) {
      console.error("Dashboard error", err);
      toast.error("Hubo un problema cargando el panel.");
    } finally {
      setIsLoading(false);
    }
  };

  /* ─────────────────────────────
     OCUPACIÓN
  ───────────────────────────── */
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

  /* ─────────────────────────────
     ESTADOS (LÓGICA SEÑA)
     - Si NO hay seña: todo se muestra como Confirmado
     - Si hay seña: se respeta status real (pending/confirmed/cancelled)
  ───────────────────────────── */
  const uiStatus = (booking) => {
    if (!depositEnabled) return "confirmed";
    return booking?.status || "confirmed";
  };

  const statusBadgeClasses = (status) => {
    return status === "confirmed"
      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
      : status === "pending"
      ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
      : status === "cancelled"
      ? "border-rose-500/60 bg-rose-500/10 text-rose-200"
      : "border-slate-500/60 bg-slate-500/10 text-slate-200";
  };

  const statusLabel = (status) => {
    return status === "confirmed"
      ? "Confirmado"
      : status === "pending"
      ? "Pendiente"
      : status === "cancelled"
      ? "Rechazado"
      : "—";
  };

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
              Para seguir usando Ritto y que tus clientes puedan reservar, activá
              tu plan por <span className="font-semibold">$690/mes</span>.
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
          <SidebarItem
            label="Resumen"
            active
            onClick={() => navigate("/dashboard")}
          />
          <SidebarItem label="Servicios" onClick={goServices} />
          <SidebarItem label="Horarios" onClick={goAgenda} />
          <SidebarItem label="Bloqueos" onClick={goScheduleBlocks} />
          <SidebarItem label="Ajustes" onClick={goSetup} />
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
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <MetricCard
            label="Turnos de la semana"
            value={appointmentsToday.length}
            pill="Agenda"
            sublabel="Próximos 7 días"
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
          {/* IZQUIERDA */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* AGENDA SEMANAL */}
            <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold">Turnos de la semana</h2>
                  <p className="text-[11px] text-slate-400">Próximos 7 días</p>
                </div>
                <button
                  onClick={goBookings}
                  className="text-[11px] px-3 py-1 rounded-2xl bg-white/5 border border-white/10"
                >
                  Ver calendario
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden">
                <div
                  className={`grid text-[11px] border-b border-white/10 bg-slate-900/70 ${
                    depositEnabled
                      ? "grid-cols-[auto,auto,1fr,auto]"
                      : "grid-cols-[auto,auto,1fr]"
                  }`}
                >
                  <div className="px-3 py-2 text-slate-400 border-r border-white/10">
                    Fecha
                  </div>
                  <div className="px-3 py-2 text-slate-400 border-r border-white/10">
                    Hora
                  </div>
                  <div className="px-3 py-2 text-slate-400">
                    Cliente · Servicio · Estado
                  </div>
                  {depositEnabled && (
                    <div className="px-3 py-2 text-slate-400 border-l border-white/10 text-right">
                      Seña
                    </div>
                  )}
                </div>

                <div className="max-h-[320px] overflow-auto text-[12px]">
                  {appointmentsToday.length === 0 && (
                    <div className="px-4 py-6 text-slate-500 text-sm">
                      Todavía no tenés turnos esta semana.
                    </div>
                  )}

                  {appointmentsToday.map((item) => {
                    const st = uiStatus(item);
                    return (
                      <div
                        key={item.id}
                        className={`grid border-b border-white/10 hover:bg-white/5 ${
                          depositEnabled
                            ? "grid-cols-[auto,auto,1fr,auto]"
                            : "grid-cols-[auto,auto,1fr]"
                        }`}
                      >
                        <div className="px-3 py-2.5 border-r border-white/10 text-slate-200">
                          {item.date || "—"}
                        </div>

                        <div className="px-3 py-2.5 border-r border-white/10 text-slate-200">
                          {item.hour?.slice(0, 5) || "--:--"}
                        </div>

                        <div className="px-3 py-2.5 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-50">
                              {item.customer_name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {item.service_name}
                            </p>
                          </div>

                          <span
                            className={`text-[11px] px-2 py-1 rounded-2xl border whitespace-nowrap ${statusBadgeClasses(
                              st
                            )}`}
                          >
                            {statusLabel(st)}
                          </span>
                        </div>

                        {depositEnabled && (
                          <div className="px-3 py-2.5 border-l border-white/10 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openProof(item)}
                              className="text-[11px] px-2 py-1 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                            >
                              Ver PDF
                            </button>

                            {st === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => confirmBooking(item.id)}
                                  className="text-[11px] px-2 py-1 rounded-2xl border border-emerald-500/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => rejectBooking(item.id)}
                                  className="text-[11px] px-2 py-1 rounded-2xl border border-rose-500/60 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 transition"
                                >
                                  Rechazar
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-500">—</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {item.service_name}
                            </p>
                          </div>

                          <span
                            className={`text-[11px] px-2 py-1 rounded-2xl border whitespace-nowrap ${statusBadgeClasses(
                              st
                            )}`}
                          >
                            {statusLabel(st)}
                          </span>
                        </div>

                        {depositEnabled && (
                          <div className="px-3 py-2.5 border-l border-white/10 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openProof(item)}
                              className="text-[11px] px-2 py-1 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                            >
                              Ver PDF
                            </button>

                            {st === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => confirmBooking(item.id)}
                                  className="text-[11px] px-2 py-1 rounded-2xl border border-emerald-500/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => rejectBooking(item.id)}
                                  className="text-[11px] px-2 py-1 rounded-2xl border border-rose-500/60 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 transition"
                                >
                                  Rechazar
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-500">
                                —
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* CALENDARIO MENSUAL */}
            <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold">Calendario</h2>
                  <p className="text-[11px] text-slate-400 capitalize">
                    {monthLabel}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="text-[11px] px-3 py-1 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="text-[11px] px-3 py-1 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden">
                <div className="grid grid-cols-7 text-[11px] border-b border-white/10 bg-slate-900/70">
                  {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                    <div
                      key={d}
                      className="px-3 py-2 text-slate-400 border-r border-white/10 last:border-r-0"
                    >
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {calendarDays.map((d) => {
                    const dateStr = d.toISOString().slice(0, 10);

                    const inMonth =
                      d.getMonth() === calendarMonth.getMonth() &&
                      d.getFullYear() === calendarMonth.getFullYear();

                    const list = monthMap[dateStr] || [];
                    const hasAny = list.length > 0;

                    const isSelected = selectedDay === dateStr;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() =>
                          setSelectedDay((prev) => (prev === dateStr ? "" : dateStr))
                        }
                        className={`min-h-[84px] p-2 border-r border-b border-white/10 text-left hover:bg-white/5 transition ${
                          !inMonth ? "opacity-40" : ""
                        } ${isSelected ? "bg-white/5" : ""}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] text-slate-200">
                            {d.getDate()}
                          </span>
                          {hasAny && (
                            <span className="text-[10px] px-2 py-0.5 rounded-2xl border border-white/10 bg-white/5 text-slate-200">
                              {list.length}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 space-y-1">
                          {(list || []).slice(0, 2).map((b) => {
                            const st = uiStatus(b);
                            return (
                              <div
                                key={b.id}
                                className="flex items-center justify-between gap-2"
                              >
                                <p className="text-[10px] text-slate-300 truncate">
                                  {b.hour?.slice(0, 5) || "--:--"} ·{" "}
                                  {b.service_name || "Servicio"}
                                </p>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-2xl border whitespace-nowrap ${statusBadgeClasses(
                                    st
                                  )}`}
                                >
                                  {statusLabel(st)}
                                </span>
                              </div>
                            );
                          })}

                          {list.length > 2 && (
                            <p className="text-[10px] text-slate-500">
                              +{list.length - 2} más
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DETALLE DEL DÍA */}
              {selectedDay && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">{selectedDay}</p>
                    <button
                      type="button"
                      onClick={() => setSelectedDay("")}
                      className="text-[11px] px-3 py-1 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                    >
                      Cerrar
                    </button>
                  </div>

                  {calendarLoading ? (
                    <p className="text-[12px] text-slate-400">
                      Cargando turnos...
                    </p>
                  ) : (monthMap[selectedDay] || []).length === 0 ? (
                    <p className="text-[12px] text-slate-400">
                      No hay turnos este día.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(monthMap[selectedDay] || []).map((b) => {
                        const st = uiStatus(b);
                        return (
                          <div
                            key={b.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/40 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium truncate">
                                {b.hour?.slice(0, 5) || "--:--"} ·{" "}
                                {b.customer_name || "Cliente"}
                              </p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {b.service_name || "Servicio"}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[11px] px-2 py-1 rounded-2xl border whitespace-nowrap ${statusBadgeClasses(
                                  st
                                )}`}
                              >
                                {statusLabel(st)}
                              </span>

                              {depositEnabled && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openProof(b)}
                                    className="text-[11px] px-2 py-1 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
                                  >
                                    Ver PDF
                                  </button>

                                  {st === "pending" ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => confirmBooking(b.id)}
                                        className="text-[11px] px-2 py-1 rounded-2xl border border-emerald-500/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition"
                                      >
                                        Confirmar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => rejectBooking(b.id)}
                                        className="text-[11px] px-2 py-1 rounded-2xl border border-rose-500/60 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 transition"
                                      >
                                        Rechazar
                                      </button>
                                    </>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* DERECHA (CARDS) */}
          <div className="flex flex-col gap-6">
            {/* TRIAL ACTIVO */}
            {trialActive && !isLifetime && (
              <div className="rounded-3xl bg-slate-900/70 border border-emerald-400/30 backdrop-blur-xl shadow-[0_18px_60px_rgba(16,185,129,0.18)] p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] text-emerald-300/90 font-semibold">
                    Prueba gratuita activa
                  </p>
                  <span className="text-[10px] px-2 py-0.5 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-200">
                    {daysLeft} días
                  </span>
                </div>
                <p className="text-sm font-semibold mb-2">
                  {daysLeft} días para enamorarte de Ritto
                </p>
                <p className="text-[11px] text-slate-300 mb-4">
                  Usá la agenda sin límites. Después solo{" "}
                  <span className="font-semibold">$690/mes</span>.
                </p>
                <button
                  onClick={configurePayment}
                  className="w-full text-xs px-3 py-2 rounded-2xl bg-emerald-400 text-slate-950 font-semibold hover:bg-emerald-300 transition"
                >
                  Configurar método de pago
                </button>
                <p className="text-[10px] text-slate-400 mt-3">
                  • Sin permanencia · Cancelás cuando quieras
                </p>
              </div>
            )}

            {/* SERVICIOS TOP */}
            <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Servicios top</p>
                <p className="text-[11px] text-slate-400">Últimos 30 días</p>
              </div>

              {topServices.length === 0 ? (
                <p className="text-[12px] text-slate-400">
                  No hay suficientes datos todavía.
                </p>
              ) : (
                <div className="space-y-3">
                  {topServices.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium truncate">
                          {s.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {s.duration ? `${s.duration} min` : "—"} ·{" "}
                          {s.price ? `$${Number(s.price)}` : "—"}
                        </p>
                      </div>
                      <span className="text-[11px] px-2 py-1 rounded-2xl border border-white/10 bg-white/5 text-slate-200 whitespace-nowrap">
                        {s.count} turnos
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LINK PÚBLICO */}
            <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-5">
              <p className="text-sm font-semibold mb-1">Link público</p>
              <p className="text-[11px] text-slate-400 mb-3">
                Copiá este link y compartilo con tus clientes.
              </p>

              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-200 truncate">
                  {publicLink || "—"}
                </div>
                <button
                  type="button"
                  onClick={copyPublicLink}
                  className="text-[12px] px-4 py-2 rounded-2xl bg-cyan-300 text-slate-950 font-semibold hover:bg-cyan-200 transition"
                >
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>

              <button
                type="button"
                onClick={openPublicLink}
                className="w-full mt-3 text-[12px] px-3 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                Abrir link público
              </button>
            </div>

            {/* ATAJOS RÁPIDOS */}
            <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-5">
              <p className="text-sm font-semibold mb-3">Atajos rápidos</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={goServices}
                  className="text-[12px] px-3 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                >
                  Crear servicio
                </button>
                <button
                  type="button"
                  onClick={goScheduleBlocks}
                  className="text-[12px] px-3 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                >
                  Bloquear horario
                </button>
                <button
                  type="button"
                  onClick={goAgenda}
                  className="col-span-2 text-[12px] px-3 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                >
                  Configurar horarios
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ─────────────────────────────
   COMPONENTES AUXILIARES (EN ESTE ARCHIVO)
   - Mantienen estética existente
──────────────────────────────────────── */

function SidebarItem({ label, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-2xl transition border ${
        active
          ? "bg-white/10 border-white/15"
          : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
      }`}
    >
      <span className="text-[12px]">{label}</span>
    </button>
  );
}

function MetricCard({ label, value, pill, sublabel }) {
  return (
    <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-slate-400">{label}</p>
        {pill ? (
          <span className="text-[10px] px-2 py-0.5 rounded-2xl border border-white/10 bg-white/5 text-slate-200">
            {pill}
          </span>
        ) : null}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      {sublabel ? (
        <p className="text-[11px] text-slate-500 mt-1">{sublabel}</p>
      ) : null}
    </div>
  );
}
