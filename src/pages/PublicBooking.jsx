import { useEffect, useState } from "react";
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
  const [selectedHour, setSelectedHour] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // ────────────────────────────────────────────────
  // CARGAR DATOS
  // ────────────────────────────────────────────────
  const loadData = async () => {
    try {
      setError("");

      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!biz) {
        setError("No se encontró el negocio.");
        return;
      }

      setBusiness(biz);

      const { data: servs } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", biz.id)
        .eq("is_active", true);

      setServices(servs || []);

      const { data: scheds } = await supabase
        .from("schedules")
        .select("*")
        .eq("business_id", biz.id);

      setSchedules(scheds || []);

      const { data: blks } = await supabase
        .from("schedule_blocks")
        .select("*")
        .eq("business_id", biz.id);

      setBlocks(blks || []);
    } catch (err) {
      setError("Error cargando datos.");
    }
  };

  // ────────────────────────────────────────────────
  // HORAS DISPONIBLES
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (selectedDate && selectedService) {
      calculateAvailableHours();
    } else {
      setAvailableHours([]);
    }
  }, [selectedDate, selectedService]);

  const calculateAvailableHours = async () => {
    if (!business || !selectedService || !selectedDate) return;

    const todayStr = new Date(selectedDate).toISOString().slice(0, 10);

    // Día bloqueado
    const isBlocked = blocks.some((b) => b.date === todayStr);
    if (isBlocked) {
      setAvailableHours([]);
      return;
    }

    // Día de semana
    const dayOfWeekName = new Date(selectedDate)
      .toLocaleDateString("es-UY", { weekday: "long" })
      .toLowerCase();

    const todays = schedules.filter(
      (s) => String(s.day_of_week || "").toLowerCase() === dayOfWeekName
    );

    if (todays.length === 0) {
      setAvailableHours([]);
      return;
    }

    // Reservas existentes
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("business_id", business.id)
      .eq("date", selectedDate);

    const hours = [];

    todays.forEach((slot) => {
      let current = slot.start_time.slice(0, 5);
      const end = slot.end_time.slice(0, 5);

      while (current < end) {
        const normalized = `${current}:00`;

        const count = bookings?.filter((b) => b.hour === normalized).length || 0;
        const capacity = slot.capacity_per_slot || 1;

        if (count < capacity) {
          hours.push(current);
        }

        current = addMinutes(current, selectedService.duration);
      }
    });

    setAvailableHours(hours);
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
    business && business.deposit_enabled && Number(business.deposit_value) > 0;

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
      setError("Completa todos los campos para reservar.");
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

      setSuccess("Reserva creada con éxito. ¡Te esperamos!");
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
      setError("No se pudo iniciar el pago.");
      setIsProcessing(false);
      return;
    }

    window.location.href = data.init_point;
  };

  // ────────────────────────────────────────────────
  // LOADING
  // ────────────────────────────────────────────────
  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        Cargando negocio...
      </div>
    );
  }

  const depositAmount = calculateDepositAmount();

  // ────────────────────────────────────────────────
  // UI PREMIUM
  // ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-8 animate-fadeIn">

        {/* HEADER */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {business.name}
          </h1>

          {business.address && (
            <p className="text-xs text-slate-400">{business.address}</p>
          )}
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-slate-900/70 border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl p-6 space-y-6"
        >
          {/* SERVICIO */}
          <Field label="Servicio">
            <select
              className="input-ritto"
              onChange={(e) =>
                setSelectedService(
                  services.find((s) => String(s.id) === e.target.value)
                )
              }
            >
              <option value="">Elegí un servicio</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — ${s.price}
                </option>
              ))}
            </select>
          </Field>

          {/* FECHA */}
          <Field label="Fecha">
            <input
              type="date"
              className="input-ritto"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </Field>

          {/* HORARIO */}
          <Field label="Horario">
            <select
              className="input-ritto"
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
            >
              <option value="">Elegí un horario</option>
              {availableHours.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            {selectedDate &&
              selectedService &&
              availableHours.length === 0 && (
                <p className="text-[11px] text-slate-400 mt-1">
                  No hay horarios disponibles para ese día.
                </p>
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

          {/* DATOS PERSONALES */}
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

          {/* ERROR */}
          {error && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-[12px] text-rose-200">
              {error}
            </div>
          )}

          {/* SUCCESS */}
          {success && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[12px] text-emerald-200">
              {success}
            </div>
          )}

          {/* BOTÓN */}
          <button
            type="submit"
            disabled={isProcessing}
            className="button-ritto mt-2 disabled:opacity-60"
          >
            {isProcessing
              ? "Procesando..."
              : usesDeposit
              ? "Ir a pagar la seña"
              : "Confirmar reserva"}
          </button>
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
