import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function PublicBooking() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [blocks, setBlocks] = useState([]);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableHours, setAvailableHours] = useState([]); // compatibilidad con tu UI anterior
  const [slotsUI, setSlotsUI] = useState([]); // NUEVO: [{ hour:"10:00", available:true/false, remaining: n }]
  const [selectedHour, setSelectedHour] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);

  // ────────────────────────────────────────────────
  // NORMALIZACIÓN DE DÍAS (FIX REAL)
  // ────────────────────────────────────────────────
  const normalizeDay = (str) => {
    return (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  // Para comparar contra schedules guardados como "Lunes", "Miércoles", etc.
  const getDayNameFromDate = (yyyyMmDd) => {
    // Evita bugs por timezone: crea la fecha como "medio día" local
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return dt.toLocaleDateString("es-UY", { weekday: "long" });
  };

  // ────────────────────────────────────────────────
  // CARGAR DATOS DEL NEGOCIO
  // ────────────────────────────────────────────────
  useEffect(() => {
    // FIX refresh fatal: slug puede venir undefined al inicio
    if (!slug) return;

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const loadData = async () => {
    try {
      setError("");
      setSuccess("");
      setLoading(true);

      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (bizErr) {
        console.error(bizErr);
        setError("No se pudo cargar el negocio.");
        setLoading(false);
        return;
      }

      if (!biz) {
        setError("No existe un negocio con ese enlace.");
        setLoading(false);
        return;
      }

      setBusiness(biz);

      // Servicios activos
      const { data: servs, error: servErr } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", biz.id)
        .eq("is_active", true);

      if (servErr) console.error(servErr);
      setServices(servs || []);

      // Horarios
      const { data: scheds, error: schedErr } = await supabase
        .from("schedules")
        .select("*")
        .eq("business_id", biz.id);

      if (schedErr) console.error(schedErr);
      setSchedules(scheds || []);

      // Bloqueos
      const { data: blks, error: blkErr } = await supabase
        .from("schedule_blocks")
        .select("*")
        .eq("business_id", biz.id);

      if (blkErr) console.error(blkErr);
      setBlocks(blks || []);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Error cargando datos.");
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  // HORARIOS DISPONIBLES (FIX REAL)
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (selectedDate && selectedService && business) {
      calculateAvailableHours();
    } else {
      setAvailableHours([]);
      setSlotsUI([]);
      setSelectedHour("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedService, business, schedules, blocks]);

  const calculateAvailableHours = async () => {
    if (!business || !selectedService || !selectedDate) return;

    const dateStr = selectedDate;

    // Día bloqueado completo
    const isBlocked = blocks.some((b) => b.date === dateStr);
    if (isBlocked) {
      setAvailableHours([]);
      setSlotsUI([]);
      setSelectedHour("");
      return;
    }

    // FIX clave: normalizar día del week y comparar con schedules (con tildes/mayúsculas)
    const dayName = getDayNameFromDate(dateStr); // ejemplo: "lunes" o "Lunes" según locale
    const dayKey = normalizeDay(dayName);

    const todays = schedules.filter(
      (s) => normalizeDay(s.day_of_week) === dayKey
    );

    if (!todays.length) {
      setAvailableHours([]);
      setSlotsUI([]);
      setSelectedHour("");
      return;
    }

    // bookings del día
    const { data: bookings, error: bookingsErr } = await supabase
      .from("bookings")
      .select("hour, status")
      .eq("business_id", business.id)
      .eq("date", dateStr);

    if (bookingsErr) console.error(bookingsErr);

    // STEP: usa slot_interval_minutes del negocio como “grilla base”
    // Si no existe, cae al duration del servicio (y si falta, 30).
    const step = Number(business.slot_interval_minutes) || Number(selectedService.duration) || 30;

    const hoursSet = new Set();
    const slots = [];

    // Generar todas las horas de trabajo de ese día (y marcar disponibilidad por capacity)
    todays.forEach((slot) => {
      let current = slot.start_time.slice(0, 5);
      const end = slot.end_time.slice(0, 5);

      while (current < end) {
        const normalized = `${current}:00`;

        // consideramos ocupados los que estén confirmed o pending (si tu app usa pending)
        const used =
          (bookings || []).filter(
            (b) =>
              b.hour === normalized &&
              (b.status === "confirmed" || b.status === "pending")
          ).length || 0;

        const capacity = slot.capacity_per_slot || 1;
        const remaining = Math.max(capacity - used, 0);
        const available = remaining > 0;

        slots.push({ hour: current, available, remaining, capacity });

        if (available) hoursSet.add(current);

        current = addMinutes(current, step);
      }
    });

    // Deduplicar por si hay múltiples franjas ese día y ordenar
    const uniqueSlotsMap = new Map();
    slots.forEach((s) => {
      // si hay duplicado, dejamos el que tenga más remaining
      const prev = uniqueSlotsMap.get(s.hour);
      if (!prev || s.remaining > prev.remaining) uniqueSlotsMap.set(s.hour, s);
    });

    const uniqueSlots = Array.from(uniqueSlotsMap.values()).sort((a, b) =>
      a.hour.localeCompare(b.hour)
    );

    setSlotsUI(uniqueSlots);
    setAvailableHours(Array.from(hoursSet).sort());
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

  // ────────────────────────────────────────────────
  // SEÑA
  // ────────────────────────────────────────────────
  const usesDeposit =
    business?.deposit_enabled && Number(business.deposit_value) > 0;

  const calculateDepositAmount = () => {
    if (!usesDeposit || !selectedService) return 0;

    const val = Number(business.deposit_value);
    const price = Number(selectedService.price);

    if (business.deposit_type === "percentage") {
      return Math.round((price * val) / 100);
    }

    return val;
  };

  // ────────────────────────────────────────────────
  // RESERVAR
  // ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !selectedService ||
      !selectedDate ||
      !selectedHour ||
      !name.trim() ||
      !email.trim()
    ) {
      setError("Completá todos los campos.");
      return;
    }

    if (!business) {
      setError("No se pudo validar el negocio.");
      return;
    }

    setIsProcessing(true);

    // SIN SEÑA
    if (!usesDeposit) {
      const { error: insertError } = await supabase.from("bookings").insert({
        business_id: business.id,
        service_id: selectedService.id,
        service_name: selectedService.name,
        date: selectedDate,
        hour: `${selectedHour}:00`,
        customer_name: name,
        customer_email: email,
        status: "confirmed",
        deposit_paid: false,
      });

      if (insertError) {
        setError(insertError.message);
        setIsProcessing(false);
        return;
      }

      // Nota: Emails los vamos a disparar con Resend desde backend luego (confirmación + reminder 24h).
      setSuccess("Reserva confirmada. Te enviamos un email ✉️");
      setIsProcessing(false);
      return;
    }

    // CON SEÑA
    const amount = calculateDepositAmount();

    const { data, error: fnError } = await supabase.functions.invoke(
      "create-mercadopago-checkout",
      {
        body: {
          business_id: business.id,
          amount,
          description: `Seña — ${selectedService.name}`,
          service_id: selectedService.id,
          service_name: selectedService.name,
          service_price: selectedService.price,
          date: selectedDate,
          hour: `${selectedHour}:00`,
          customer_name: name,
          customer_email: email,
          slug: business.slug,
        },
      }
    );

    if (fnError || !data?.init_point) {
      console.error(fnError);
      setError("No se pudo iniciar el pago.");
      setIsProcessing(false);
      return;
    }

    window.location.href = data.init_point;
  };

  // ────────────────────────────────────────────────
  // UI
  // ────────────────────────────────────────────────
  const depositAmount = calculateDepositAmount();

  // Flecha: si el usuario está logueado, volver al dashboard; si no, volver atrás
  const handleBack = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) navigate("/dashboard");
      else navigate(-1);
    } catch {
      navigate(-1);
    }
  };

  // Para evitar elegir fechas pasadas (opcional, no rompe nada)
  const minDate = useMemo(() => {
    const t = new Date();
    const yyyy = t.getFullYear();
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    const dd = String(t.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        Cargando negocio...
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        {error ? error : "Cargando negocio..."}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-8 animate-fadeIn">
        {/* HEADER + FLECHA */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-xs px-3 py-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
          >
            ← Volver
          </button>

          <div className="text-right">
            <p className="text-[10px] text-slate-400">Reservas</p>
            <p className="text-xs text-slate-300">{business.slug}</p>
          </div>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {business.name}
          </h1>
          {business.address && (
            <p className="text-xs text-slate-400">{business.address}</p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-slate-900/70 border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl p-6 space-y-6"
        >
          {/* SERVICIO */}
          <Field label="Servicio">
            <select
              className="input-ritto"
              value={selectedService?.id || ""}
              onChange={(e) => {
                const svc = services.find((s) => String(s.id) === e.target.value);
                setSelectedService(svc || null);
                setSelectedHour("");
              }}
            >
              <option value="">Elegí un servicio</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — ${s.price} — {s.duration} min
                </option>
              ))}
            </select>
          </Field>

          {/* FECHA */}
          <Field label="Fecha">
            <input
              type="date"
              className="input-ritto"
              min={minDate}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedHour("");
              }}
            />
          </Field>

          {/* HORARIOS: GRID (AZUL DISPONIBLE / GRIS OCUPADO) */}
          <Field label="Horarios disponibles">
            {!selectedService || !selectedDate ? (
              <p className="text-[11px] text-slate-400">
                Elegí un servicio y una fecha para ver los horarios.
              </p>
            ) : slotsUI.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                No hay horarios disponibles para ese día.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {slotsUI.map((s) => {
                  const isSelected = selectedHour === s.hour;

                  return (
                    <button
                      key={s.hour}
                      type="button"
                      disabled={!s.available}
                      onClick={() => setSelectedHour(s.hour)}
                      className={`px-2 py-2 rounded-2xl text-[11px] border transition ${
                        s.available
                          ? isSelected
                            ? "border-emerald-400/60 bg-emerald-400 text-slate-950 font-semibold"
                            : "border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20"
                          : "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
                      }`}
                      title={
                        s.available
                          ? `Disponible (${s.remaining}/${s.capacity})`
                          : "Ocupado"
                      }
                    >
                      {s.hour}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          {/* Mantengo el SELECT (tu UI anterior) pero opcional: se sincroniza con el grid */}
          <Field label="Horario elegido">
            <select
              className="input-ritto"
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
              disabled={!selectedService || !selectedDate || slotsUI.length === 0}
            >
              <option value="">
                {slotsUI.length === 0 ? "Sin horarios" : "Elegí un horario"}
              </option>
              {slotsUI
                .filter((s) => s.available)
                .map((s) => (
                  <option key={s.hour} value={s.hour}>
                    {s.hour}
                  </option>
                ))}
            </select>
          </Field>

          {/* SEÑA */}
          {usesDeposit && selectedService && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-200">
              <p className="font-semibold">Seña requerida</p>
              <p>
                Para confirmar el turno aboná{" "}
                <span className="font-bold text-emerald-300">
                  ${depositAmount}
                </span>
              </p>
            </div>
          )}

          {/* DATOS CLIENTE */}
          <Field label="Tus datos">
            <input
              type="text"
              className="input-ritto mb-2"
              placeholder="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="email"
              className="input-ritto"
              placeholder="Tu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          {/* ALERTAS */}
          {error && <Alert error text={error} />}
          {success && <Alert success text={success} />}

          <button
            type="submit"
            disabled={isProcessing}
            className="button-ritto mt-2 disabled:opacity-60 w-full"
          >
            {isProcessing
              ? "Procesando..."
              : usesDeposit
              ? "Ir a pagar la seña"
              : "Confirmar reserva"}
          </button>

          {/* NOTA UX */}
          <p className="text-[10px] text-slate-500">
            Al confirmar, vas a recibir un email de confirmación. (Luego agregamos el recordatorio 24h con Resend)
          </p>
        </form>
      </div>
    </div>
  );
}

/* COMPONENTE FIELD */
function Field({ label, children }) {
  return (
    <div>
      <label className="text-[12px] text-slate-300">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Alert({ error, success, text }) {
  return (
    <div
      className={`rounded-2xl px-4 py-2 text-[12px] ${
        error
          ? "border border-rose-500/40 bg-rose-500/10 text-rose-200"
          : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      }`}
    >
      {text}
    </div>
  );
}
