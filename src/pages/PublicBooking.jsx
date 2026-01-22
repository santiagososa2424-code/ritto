// PublicBooking.jsx (CORREGIDO: email solo cuando corresponde)
// - NO cambia estética ni lógica de reservas
// - Mantiene helper sendConfirmationEmail + envío SOLO sin seña
// - Con seña: NO envía email (se manda al confirmar en el negocio)
//
// ✅ PATCH RESEND:
// - La Edge Function send-booking-confirmation normalmente espera { booking_id }
// - Por eso: al insertar reserva SIN seña, pedimos el id con .select("id").single()
// - Y llamamos a sendConfirmationEmail(created.id)

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
  const [availableHours, setAvailableHours] = useState([]);
  const [slotsUI, setSlotsUI] = useState([]);
  const [selectedHour, setSelectedHour] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // PASO SEÑA (aparece recién después de “Reservar”)
  const [showDepositStep, setShowDepositStep] = useState(false);
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
  // ✅ FIX: bloquea por DURACIÓN REAL del servicio (no solo 1 slot)
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
  }, [selectedDate, selectedService, business, schedules, blocks, services]);

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

    const todays = schedules.filter((s) => normalizeDay(s.day_of_week) === dayKey);

    if (!todays.length) {
      setAvailableHours([]);
      setSlotsUI([]);
      setSelectedHour("");
      return;
    }

    // Traer bookings con service_id para calcular duración real de cada reserva
    const { data: bookings } = await supabase
      .from("bookings")
      .select("hour, status, service_id")
      .eq("business_id", business.id)
      .eq("date", dateStr);

    // Intervalo base SIEMPRE = slot_interval_minutes (no usar duración del servicio como step)
    const interval = Number(business.slot_interval_minutes) || 30;

    const serviceDuration = Number(selectedService.duration) || interval;

    // Duración por servicio (ya tenés services cargados)
    const durationByServiceId = new Map(
      (services || []).map((s) => [s.id, Number(s.duration) || interval])
    );

    const toMins = (hhmmOrHHMMSS) => {
      const s = String(hhmmOrHHMMSS || "").slice(0, 5);
      const [h, m] = s.split(":").map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
      return h * 60 + m;
    };

    const toHHMM = (mins) => {
      const h = String(Math.floor(mins / 60)).padStart(2, "0");
      const m = String(mins % 60).padStart(2, "0");
      return `${h}:${m}`;
    };

    const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

    // Normalizar bookings del día a rangos [start,end) en minutos
    const bookingRanges = (bookings || [])
      .filter((b) => b && (b.status === "confirmed" || b.status === "pending"))
      .map((b) => {
        const start = toMins(b.hour);
        const dur = durationByServiceId.get(b.service_id) || interval; // fallback seguro
        if (start === null) return null;
        return { start, end: start + dur };
      })
      .filter(Boolean);

    // Cuenta cuántos bookings pisan un sub-slot [t, t+interval)
    const countOverlapInSubSlot = (t) => {
      const subStart = t;
      const subEnd = t + interval;
      let c = 0;
      for (const r of bookingRanges) {
        if (overlaps(r.start, r.end, subStart, subEnd)) c++;
      }
      return c;
    };

    const hoursSet = new Set();
    const slots = [];

    todays.forEach((slot) => {
      const startHHMM = normalizeHHMM(slot.start_time);
      const endHHMM = normalizeHHMM(slot.end_time);

      const dayStart = toMins(startHHMM);
      const dayEnd = toMins(endHHMM);

      if (dayStart === null || dayEnd === null) return;

      const capacity = slot.capacity_per_slot || 1;

      // Generamos posibles starts por intervalos base,
      // y exigimos que la duración completa entre dentro del horario del negocio
      for (let t = dayStart; t + serviceDuration <= dayEnd; t += interval) {
        let maxUsed = 0;
        let ok = true;

        // Validar capacidad en TODOS los sub-slots que cubre el servicio
        for (let x = t; x < t + serviceDuration; x += interval) {
          const used = countOverlapInSubSlot(x);
          if (used > maxUsed) maxUsed = used;
          if (used >= capacity) {
            ok = false;
            break;
          }
        }

        const hour = toHHMM(t);
        const remaining = Math.max(capacity - maxUsed, 0);
        const available = ok && remaining > 0;

        slots.push({ hour, available, remaining, capacity });

        if (available) hoursSet.add(hour);
      }
    });

    // Mantener tu lógica de “si hay duplicado, quedate con el que tenga más remaining”
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
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
      2,
      "0"
    )}`;
  };

  // ────────────────────────────────────────────────
  // SEÑA (TRANSFERENCIA) — SOLO MONTO FIJO
  // ────────────────────────────────────────────────
  const usesDeposit =
    business?.deposit_enabled === true && Number(business.deposit_value) > 0;

  const depositAmount = useMemo(() => {
    if (!usesDeposit || !selectedService) return 0;
    return Number(business.deposit_value) || 0;
  }, [usesDeposit, business?.deposit_value, selectedService]);

  // ────────────────────────────────────────────────
  // UPLOAD COMPROBANTE (storage)
  // ────────────────────────────────────────────────
  const uploadReceipt = async (bizId, file) => {
    const cleanName = String(file.name || "comprobante")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._-]/g, "");

    const path = `${bizId}/${Date.now()}-${cleanName}`;

    const { error: upErr } = await supabase.storage.from("ritto_receipts").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

    if (upErr) throw upErr;
    return path;
  };

  // ────────────────────────────────────────────────
  // EMAIL CONFIRMACIÓN (EDGE FUNCTION)
  // ✅ Se usa SOLO cuando la reserva queda confirmada (sin seña)
  // ✅ PATCH: enviamos booking_id, que es lo que normalmente espera la función
  // ────────────────────────────────────────────────
  const sendConfirmationEmail = async (booking_id) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-booking-confirmation", {
        body: { booking_id },
      });

      if (error) {
        console.error("send-booking-confirmation invoke error:", error);
        console.error("context:", error?.context);
        return { ok: false };
      }

      return { ok: true, data };
    } catch (e) {
      console.error("sendConfirmationEmail error:", e);
      return { ok: false };
    }
  };

  // ────────────────────────────────────────────────
  // SUBMIT (2 PASOS SI HAY SEÑA)
  // ────────────────────────────────────────────────
  const validateBaseFields = () => {
    if (
      !selectedService ||
      !selectedDate ||
      !selectedHour ||
      !name.trim() ||
      !email.trim() ||
      !phone.trim()
    ) {
      setError("Completá todos los campos.");
      return false;
    }
    if (!business) {
      setError("No se pudo validar el negocio.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateBaseFields()) return;

    // SIN SEÑA: mismo flujo que hoy (confirmado + email)
    if (!usesDeposit) {
      setIsProcessing(true);
      try {
        const hourToSave = `${selectedHour}:00`;

        // ✅ PATCH: pedimos el id creado para pasarlo a la Edge Function
        const { data: created, error: insertError } = await supabase
          .from("bookings")
          .insert({
            business_id: business.id,
            service_id: selectedService.id,
            service_name: selectedService.name,
            date: selectedDate,
            hour: hourToSave,
            customer_name: name,
            customer_email: email,
            customer_phone: phone,
            status: "confirmed",
            deposit_paid: false,
            deposit_receipt_path: null,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;

        // ✅ Enviar email (si falla, no rompe la reserva)
        if (created?.id) {
          await sendConfirmationEmail(created.id);
        } else {
          console.warn("Booking creado sin id retornado; no se envía email.");
        }

        setSuccess("Reserva confirmada. Te enviamos un email ✉️");
      } catch (err) {
        console.error(err);
        setError(err?.message || "No se pudo crear la reserva.");
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // CON SEÑA: primer click en “Reservar” muestra el paso de comprobante
    if (!showDepositStep) {
      setShowDepositStep(true);
      setReceiptFile(null);
      return;
    }

    // CON SEÑA: segundo click en “Confirmar reserva” exige comprobante y crea pending
    if (!receiptFile) {
      setError("Subí tu captura del comprobante para confirmar la reserva.");
      return;
    }

    setIsProcessing(true);

    try {
      let receiptPath = null;

      // Aceptamos captura (imagen) o PDF (por si alguien igual sube PDF)
      const okType =
        String(receiptFile.type || "").startsWith("image/") ||
        receiptFile.type === "application/pdf";

      if (!okType) {
        setError("El comprobante debe ser una imagen o un PDF.");
        setIsProcessing(false);
        return;
      }

      receiptPath = await uploadReceipt(business.id, receiptFile);

      const hourToSave = `${selectedHour}:00`;

      const { error: insertPendingError } = await supabase.from("bookings").insert({
        business_id: business.id,
        service_id: selectedService.id,
        service_name: selectedService.name,
        date: selectedDate,
        hour: hourToSave,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        status: "pending",
        deposit_paid: true, // hay comprobante adjunto
        deposit_receipt_path: receiptPath,
      });

      if (insertPendingError) throw insertPendingError;

      // ✅ CON SEÑA: NO se manda email todavía (se manda cuando el negocio confirma)
      setSuccess(
        "Reserva enviada. El negocio confirmará tu reserva y te llegará un email cuando esté confirmada."
      );
      setShowDepositStep(false);
      setReceiptFile(null);
    } catch (err) {
      console.error(err);
      setError(err?.message || "No se pudo crear la reserva.");
    } finally {
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

  useEffect(() => {
    // si el usuario cambia algo base, cerramos el paso seña para evitar inconsistencias
    setShowDepositStep(false);
    setReceiptFile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService?.id, selectedDate, selectedHour]);

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

  const bank = business.deposit_bank || "—";
  const accountName = business.deposit_account_name || "—";
  const transferNumber = business.deposit_transfer_alias || "—";
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-8 animate-fadeIn">
        {/* HEADER NEGOCIO */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">{business.name}</h1>

          {business.address && <p className="text-xs text-slate-400">{business.address}</p>}

          {business.phone && (
            <button
              onClick={() =>
                window.open(`https://wa.me/${business.phone.replace(/\D/g, "")}`, "_blank")
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
                      <div className="font-medium leading-tight">{s.name || "Servicio"}</div>
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
              <p className="text-[12px] text-slate-400">No hay horarios disponibles para ese día.</p>
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

          {/* PASO SEÑA (APARECE AL FINAL, SOLO DESPUÉS DE “RESERVAR”) */}
          {usesDeposit && showDepositStep && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-200 space-y-3">
              <div>
                <p className="font-semibold">Esta reserva requiere una seña</p>
                <p>
                  Monto: <span className="font-bold text-emerald-300">${depositAmount}</span>{" "}
                  (transferencia)
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-[12px] text-slate-200">
                <p className="text-[11px] text-slate-300 mb-2">Datos para transferir:</p>
                <div className="space-y-1">
                  <p className="text-[12px]">
                    <span className="text-slate-400">Banco:</span> {bank}
                  </p>
                  <p className="text-[12px]">
                    <span className="text-slate-400">Nombre:</span> {accountName}
                  </p>
                  <p className="text-[12px]">
                    <span className="text-slate-400">Número de transferencia:</span>{" "}
                    {transferNumber}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] text-emerald-200/80">
                  Subí tu captura del comprobante y el negocio confirmará tu turno.
                </p>

                {/* Sin “bloque feo”: input oculto + botón estilado */}
                <input
                  id="receipt-upload"
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="receipt-upload"
                    className="text-[12px] px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer"
                  >
                    Subir comprobante
                  </label>

                  {receiptFile ? (
                    <span className="text-[11px] text-slate-300 truncate">{receiptFile.name}</span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Ningún archivo seleccionado</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowDepositStep(false);
                  setReceiptFile(null);
                }}
                className="text-[11px] px-3 py-1 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                Volver
              </button>
            </div>
          )}

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
              ? showDepositStep
                ? "Confirmar reserva"
                : "Reservar"
              : "Confirmar reserva"}
          </button>

          {/* ✅ Texto coherente con seña */}
          <p className="text-[10px] text-slate-500">
            {usesDeposit
              ? "Cuando el negocio confirme tu reserva, te llegará un email con los detalles."
              : "Vas a recibir un email de confirmación con los detalles de tu turno."}
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
