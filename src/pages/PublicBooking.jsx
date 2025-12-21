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
  // CARGAR DATOS DEL NEGOCIO
  // ────────────────────────────────────────────────
  const loadData = async () => {
    try {
      setError("");

      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (bizErr || !biz) {
        setError("No existe un negocio con ese enlace.");
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
      console.error(err);
      setError("Error cargando datos.");
    }
  };

  // ────────────────────────────────────────────────
  // HORARIOS DISPONIBLES (FIX REAL)
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

    const dateStr = selectedDate;

    // Día bloqueado completo
    if (blocks.some((b) => b.date === dateStr)) {
      setAvailableHours([]);
      return;
    }

    // 🔥 FIX CLAVE: mismo formato que guardás en schedules
    const dayName = new Date(selectedDate).toLocaleDateString("es-UY", {
      weekday: "long",
    });

    const todays = schedules.filter(
      (s) => s.day_of_week === dayName
    );

    if (!todays.length) {
      setAvailableHours([]);
      return;
    }

    const { data: bookings } = await supabase
      .from("bookings")
      .select("hour")
      .eq("business_id", business.id)
      .eq("date", dateStr);

    const step = Math.max(
      selectedService.duration,
      business.slot_interval_minutes || selectedService.duration
    );

    const hoursSet = new Set();

    todays.forEach((slot) => {
      let current = slot.start_time.slice(0, 5);
      const end = slot.end_time.slice(0, 5);

      while (current < end) {
        const normalized = `${current}:00`;
        const used =
          bookings?.filter((b) => b.hour === normalized).length || 0;

        if (used < (slot.capacity_per_slot || 1)) {
          hoursSet.add(current);
        }

        current = addMinutes(current, step);
      }
    });

    setAvailableHours(
      Array.from(hoursSet).sort()
    );
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

    if (business.deposit_type === "percentage") {
      return Math.round(
        (Number(selectedService.price) * Number(business.deposit_value)) / 100
      );
    }

    return Number(business.deposit_value);
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

    setIsProcessing(true);

    // SIN SEÑA
    if (!usesDeposit) {
      const { error } = await supabase.from("bookings").insert({
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

      if (error) {
        setError(error.message);
        setIsProcessing(false);
        return;
      }

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
      setError("No se pudo iniciar el pago.");
      setIsProcessing(false);
      return;
    }

    window.location.href = data.init_point;
  };

  // ────────────────────────────────────────────────
  // UI
  // ────────────────────────────────────────────────
  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        Cargando negocio...
      </div>
    );
  }

  const depositAmount = calculateDepositAmount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-8 animate-fadeIn">

        <div className="text-center">
          <h1 className="text-3xl font-semibold">{business.name}</h1>
          {business.address && (
            <p className="text-xs text-slate-400">{business.address}</p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-slate-900/70 border border-white/10 p-6 space-y-6"
        >
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

          <Field label="Fecha">
            <input
              type="date"
              className="input-ritto"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </Field>

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
          </Field>

          {usesDeposit && selectedService && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm">
              Seña requerida: <strong>${depositAmount}</strong>
            </div>
          )}

          <Field label="Tus datos">
            <input
              className="input-ritto mb-2"
              placeholder="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="input-ritto"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          {error && <Alert error text={error} />}
          {success && <Alert success text={success} />}

          <button
            type="submit"
            disabled={isProcessing}
            className="button-ritto w-full"
          >
            {isProcessing
              ? "Procesando..."
              : usesDeposit
              ? "Ir a pagar seña"
              : "Confirmar reserva"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* COMPONENTES */
function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs text-slate-300">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Alert({ error, success, text }) {
  return (
    <div
      className={`rounded-2xl px-4 py-2 text-xs ${
        error
          ? "border border-rose-500/40 bg-rose-500/10 text-rose-200"
          : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      }`}
    >
      {text}
    </div>
  );
}
