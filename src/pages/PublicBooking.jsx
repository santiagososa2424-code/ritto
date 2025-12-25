import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function PublicBooking() {
  const { slug } = useParams();

  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [blocks, setBlocks] = useState([]);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableHours, setAvailableHours] = useState([]); // compatibilidad con UI anterior
  const [slotsUI, setSlotsUI] = useState([]); // [{hour, available, remaining, capacity}]
  const [selectedHour, setSelectedHour] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(false);

  // ────────────────────────────────────────────────
  // NORMALIZACIÓN (DÍAS + TIEMPOS)
  // ────────────────────────────────────────────────
  const normalizeDay = (str) =>
    (str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const normalizeHHMM = (t) => {
    if (!t) return "";
    // acepta "09:00:00" o "09:00"
    const s = String(t).slice(0, 5);
    return /^\d{2}:\d{2}$/.test(s) ? s : "";
  };

  // Evita bugs por timezone: crea fecha a medio día local
  const getDayNameFromDate = (yyyyMmDd) => {
    const [y, m, d] = yyyyMmDd.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return dt.toLocaleDateString("es-UY", { weekday: "long" });
  };

  // ────────────────────────────────────────────────
  // MAPA (EMBED) + TELÉFONO
  // ────────────────────────────────────────────────
  const mapEmbedUrl = useMemo(() => {
    const raw = business?.map_url;
    if (!raw) return null;

    // si ya es embed, lo devolvemos
    if (raw.includes("google.com/maps/embed")) return raw;

    // si es un link normal de google maps, intentamos convertirlo a embed simple
    // (funciona para la mayoría de URLs compartidas)
    if (raw.includes("google.com/maps")) {
      // Google suele permitir embed con:
      // https://www.google.com/maps?q=...&output=embed
      // o si trae "place" o "search", igual suele andar con output=embed.
      const hasQuery = raw.includes("?");
      return raw + (hasQuery ? "&output=embed" : "?output=embed");
    }

    // si es cualquier otro link, intentamos mostrarlo igual dentro de iframe
    // (algunos sitios bloquean iframes; en ese caso el botón "Abrir mapa" sirve)
    return raw;
  }, [business?.map_url]);

  const openMap = () => {
    if (!business?.map_url) return;
    window.open(business.map_url, "_blank");
  };

  // ────────────────────────────────────────────────
  // CARGAR DATOS
  // ────────────────────────────────────────────────
  useEffect(() => {
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

      // Servicios (no rompo lógica; solo aseguro orden y fallback)
      const { data: servs, error: servErr } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", biz.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

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
  // HORARIOS DISPONIBLES (LOGICA PRESERVADA)
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

    const dayName = getDayNameFromDate(dateStr);
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

    const { data: bookings } = await supabase
      .from("bookings")
      .select("hour, status")
      .eq("business_id", business.id)
      .eq("date", dateStr);

    const step =
      Number(business.slot_interval_minutes) ||
      Number(selectedService.duration) ||
      30;

    const hoursSet = new Set();
    const slots = [];

    todays.forEach((slot) => {
      let current = normalizeHHMM(slot.start_time);
      const end = normalizeHHMM(slot.end_time);

      while (current && current < end) {
        const normalized = `${current}:00`;

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

    // Deduplicar y priorizar mayor remaining
    const map = new Map();
    slots.forEach((s) => {
      const prev = map.get(s.hour);
      if (!prev || s.remaining > prev.remaining) map.set(s.hour, s);
    });

    const uniqueSlots = Array.from(map.values()).sort((a, b) =>
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
  // SEÑA (SIN CAMBIOS)
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
  // SUBMIT (SIN ROMPER FLUJO)
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

      setSuccess("Reserva confirmada. Te enviamos un email ✉️");
      setIsProcessing(false);
      return;
    }

    // CON SEÑA (Mercado Pago)
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
        Cargando agenda…
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        {error || "Cargando agenda…"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-8 animate-fadeIn">

        {/* HEADER NEGOCIO */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {business.name}
          </h1>

          {business.address && (
            <p className="text-xs text-slate-400">{business.address}</p>
          )}

          {business.phone && (
            <p className="text-xs text-slate-300 mt-1">
              📞 {business.phone}
            </p>
          )}
        </div>

        {/* MAPA */}
        {mapEmbedUrl && (
          <div className="rounded-3xl overflow-hidden border border-white/10 shadow-xl">
            <iframe
              src={mapEmbedUrl}
              className="w-full h-56"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <button
              type="button"
              onClick={openMap}
              className="w-full text-xs py-2 bg-white/5 hover:bg-white/10 transition"
            >
              Abrir mapa
            </button>
          </div>
        )}

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-slate-900/70 border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl p-6 space-y-6"
        >
          {/* SERVICIO */}
          <Field label="Servicio">
            {services.length === 0 ? (
              <p className="text-[12px] text-slate-400">
                Este negocio todavía no tiene servicios configurados.
              </p>
            ) : (
              <select
                className="input-ritto"
                value={selectedService?.id || ""}
                onChange={(e) => {
                  const svc = services.find(
                    (s) => String(s.id) === e.target.value
                  );
                  setSelectedService(svc || null);
                  setSelectedHour("");
                }}
              >
                <option value="">Elegí un servicio</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || "Servicio"} — ${s.price} — {s.duration} min
                  </option>
                ))}
              </select>
            )}
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

          {/* HORARIOS */}
          <Field label="Horarios disponibles">
            {!selectedService || !selectedDate ? (
              <p className="text-[12px] text-slate-400">
                Elegí un servicio y una fecha para ver los horarios.
              </p>
            ) : slotsUI.length === 0 ? (
              <p className="text-[12px] text-slate-400">
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
                            ? "border-emerald-400 bg-emerald-400 text-slate-950 font-semibold"
                            : "border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20"
                          : "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      {s.hour}
                    </button>
                  );
                })}
              </div>
            )}
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

          {error && <Alert error text={error} />}
          {success && <Alert success text={success} />}

          <button
            type="submit"
            disabled={isProcessing}
            className="button-ritto w-full mt-2 disabled:opacity-60"
          >
            {isProcessing
              ? "Procesando…"
              : usesDeposit
              ? "Ir a pagar la seña"
              : "Confirmar reserva"}
          </button>

          <p className="text-[10px] text-slate-500">
            Vas a recibir un email de confirmación con los detalles de tu turno.
          </p>
        </form>
      </div>
    </div>
  );
}

/* COMPONENTES AUX */

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[12px] text-slate-300">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Alert({ error, text }) {
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
