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
  const [phone, setPhone] = useState("");

  // NUEVO: comprobante PDF (solo si seña activa)
  const [receiptFile, setReceiptFile] = useState(null);

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

      const { data: servs, error: servErr } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", biz.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (servErr) console.error(servErr);
      setServices(servs || []);

      const { data: scheds, error: schedErr } = await supabase
        .from("schedules")
        .select("*")
        .eq("business_id", biz.id);

      if (schedErr) console.error(schedErr);
      setSchedules(scheds || []);

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
  // GUARDRAIL: si el servicio seleccionado ya no existe
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedService) return;
    const exists = (services || []).some((s) => s.id === selectedService.id);
    if (!exists) {
      setSelectedService(null);
      setSelectedHour("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services]);

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
  // SEÑA (TRANSFERENCIA) — SOLO MONTO FIJO
  // ────────────────────────────────────────────────
  const usesDeposit =
    business?.deposit_enabled === true && Number(business.deposit_value) > 0;

  const depositAmount = useMemo(() => {
    if (!usesDeposit || !selectedService) return 0;
    return Number(business.deposit_value) || 0; // fijo
  }, [usesDeposit, business?.deposit_value, selectedService]);

  // ────────────────────────────────────────────────
  // UPLOAD PDF (storage)
  // ────────────────────────────────────────────────
  const uploadReceiptPdf = async (bizId, file) => {
    const cleanName = String(file.name || "comprobante.pdf")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._-]/g, "");

    const path = `${bizId}/${Date.now()}-${cleanName}`;

    const { error: upErr } = await supabase.storage
      .from("booking_receipts")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: "application/pdf",
      });

    if (upErr) throw upErr;

    // guardamos el path (no URL pública); el dashboard puede abrirlo con createSignedUrl si querés luego
    return path;
  };
  // ────────────────────────────────────────────────
  // SUBMIT (TRANSFERENCIA) — SIN ROMPER FLUJO
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
      !email.trim() ||
      !phone.trim()
    ) {
      setError("Completá todos los campos.");
      return;
    }

    if (!business) {
      setError("No se pudo validar el negocio.");
      return;
    }

    // si seña está activa, exigimos comprobante
    if (usesDeposit && !receiptFile) {
      setError("Subí el comprobante en PDF para confirmar la seña.");
      return;
    }

    setIsProcessing(true);

    try {
      // 1) SIN SEÑA -> confirmed como hoy
      if (!usesDeposit) {
        const { error: insertError } = await supabase.from("bookings").insert({
          business_id: business.id,
          service_id: selectedService.id,
          service_name: selectedService.name,
          date: selectedDate,
          hour: `${selectedHour}:00`,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          status: "confirmed",
          deposit_paid: false,
          deposit_receipt_path: null,
        });

        if (insertError) throw insertError;

        setSuccess("Reserva confirmada. Te enviamos un email ✉️");
        setIsProcessing(false);
        return;
      }

      // 2) CON SEÑA (TRANSFERENCIA) -> pending + pdf
      let receiptPath = null;

      if (receiptFile) {
        // validación mínima (sin romper UX)
        if (receiptFile.type !== "application/pdf") {
          setError("El comprobante debe ser un archivo PDF.");
          setIsProcessing(false);
          return;
        }
        receiptPath = await uploadReceiptPdf(business.id, receiptFile);
      }

      const { error: insertPendingError } = await supabase
        .from("bookings")
        .insert({
          business_id: business.id,
          service_id: selectedService.id,
          service_name: selectedService.name,
          date: selectedDate,
          hour: `${selectedHour}:00`,
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          status: "pending",
          deposit_paid: true, // hay comprobante adjunto
          deposit_receipt_path: receiptPath,
        });

      if (insertPendingError) throw insertPendingError;

      setSuccess(
        `Reserva enviada. El negocio confirmará la seña de $${depositAmount}.`
      );
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      setError(err?.message || "No se pudo crear la reserva.");
      setIsProcessing(false);
    }
  };

  // ────────────────────────────────────────────────
  // UI
  // ────────────────────────────────────────────────
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
            <button
              onClick={() =>
                window.open(
                  `https://wa.me/${business.phone.replace(/\D/g, "")}`,
                  "_blank"
                )
              }
              className="text-xs text-emerald-300 hover:text-emerald-200 transition mt-1"
            >
              📞 {business.phone}
            </button>
          )}
        </div>

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
              <div className="flex flex-wrap gap-2 mt-2">
                {services.map((s) => {
                  const isSelected = selectedService?.id === s.id;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedService(s);
                        setSelectedHour("");
                      }}
                      className={`px-3 py-2 rounded-2xl text-[12px] border transition ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-400 text-slate-950 font-semibold"
                          : "border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20"
                      }`}
                    >
                      <div className="font-medium leading-tight">
                        {s.name || "Servicio"}
                      </div>
                      <div className="text-[10px] opacity-80">
                        ${s.price} · {s.duration} min
                      </div>
                    </button>
                  );
                })}
              </div>
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
              <p className="font-semibold">Esta reserva requiere una seña</p>
              <p>
                Monto:{" "}
                <span className="font-bold text-emerald-300">
                  ${depositAmount}
                </span>{" "}
                (transferencia)
              </p>
              <p className="text-[11px] text-emerald-200/80 mt-1">
                Subí el comprobante en PDF y el negocio confirmará tu turno.
              </p>
            </div>
          )}

          {/* COMPROBANTE PDF (solo si seña activa) */}
          {usesDeposit && (
            <Field label="Comprobante (PDF)">
              <input
                type="file"
                accept="application/pdf"
                className="input-ritto"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
              {receiptFile ? (
                <p className="text-[10px] text-slate-400 mt-2 truncate">
                  {receiptFile.name}
                </p>
              ) : null}
            </Field>
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
              className="input-ritto mb-2"
              placeholder="Tu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="tel"
              className="input-ritto"
              placeholder="Tu teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
              ? "Enviar comprobante"
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
