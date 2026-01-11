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

      // FIX: mismo origen que semanal (evita quedar vacío si una columna no existe)
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
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
      const key = (b?.date || "").slice(0, 10); // <- CLAVE
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [monthBookings]);

  // ─────────────────────────────
  // DÍAS DEL CALENDARIO (Lun–Dom)  ✅ FIX calendarDays
  // ─────────────────────────────
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const first = new Date(year, month, 1);
    first.setHours(0, 0, 0, 0);

    // Lun(0) .. Dom(6)
    const jsDay = first.getDay(); // Dom(0)..Sab(6)
    const mondayIndex = (jsDay + 6) % 7;

    const start = new Date(first);
    start.setDate(first.getDate() - mondayIndex);
    start.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    return days;
  }, [calendarMonth]);

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
    const url = booking?.transfer_pdf_url || booking?.deposit_receipt_path;
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

      // FIX: mismo origen que semanal (evita quedar vacío si una columna no existe)
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
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
      const key = (b?.date || "").slice(0, 10); // <- CLAVE
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [monthBookings]);

  // ─────────────────────────────
  // DÍAS DEL CALENDARIO (Lun–Dom)  ✅ FIX calendarDays
  // ─────────────────────────────
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const first = new Date(year, month, 1);
    first.setHours(0, 0, 0, 0);

    // Lun(0) .. Dom(6)
    const jsDay = first.getDay(); // Dom(0)..Sab(6)
    const mondayIndex = (jsDay + 6) % 7;

    const start = new Date(first);
    start.setDate(first.getDate() - mondayIndex);
    start.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    return days;
  }, [calendarMonth]);

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
    const url = booking?.transfer_pdf_url || booking?.deposit_receipt_path;
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
                    // FIX: dateStr en LOCAL (evita desfasaje por UTC y matchea con monthMap)
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, "0");
                    const day = String(d.getDate()).padStart(2, "0");
                    const dateStr = `${y}-${m}-${day}`;

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
                          setSelectedDay((prev) =>
                            prev === dateStr ? "" : dateStr
                          )
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
