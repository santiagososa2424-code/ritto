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

      // Negocio
      const { data: biz, error: bizError } = await supabase
        .from("businesses")
        .select("*")
        .eq("slug", slug)
        .single();

      if (bizError || !biz) {
        setError("No se encontró el negocio.");
        return;
      }

      setBusiness(biz);

      // Servicios activos
      const { data: servs } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", biz.id)
        .eq("is_active", true);

      setServices(servs || []);

      // Horarios
      const { data: scheds } = await supabase
        .from("schedules")
        .select("*")
        .eq("business_id", biz.id);

      setSchedules(scheds || []);

      // Bloqueos de fechas
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
  // REGENERAR HORARIOS DISPONIBLES
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

        const countThisHour =
          bookings?.filter((b) => b.hour === normalized).length || 0;

        const capacity = slot.capacity_per_slot || 1;

        if (countThisHour < capacity) {
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
  // SEÑA (DEPOSITO)
  // ────────────────────────────────────────────────
  const usesDeposit =
    business && business.deposit_enabled && Number(business.deposit_value) > 0;

  const calculateDepositAmount = () => {
    if (!usesDeposit || !selectedService) return 0;

    const value = Number(business.deposit_value);
    const price = Number(selectedService.price);

    if (business.deposit_type === "percentage") {
      return Math.round((price * value) / 100);
    }

    return value;
  };

  // ────────────────────────────────────────────────
  // GUARDAR RESERVA
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

    if (!business) {
      setError("Negocio no encontrado.");
      return;
    }

    setIsProcessing(true);

    // Caso sin seña
    if (!usesDeposit) {
      const { data: inserted, error: insertError } = await supabase
        .from("bookings")
        .insert({
          business_id: business.id,
          service_id: selectedService.id,
          service_name: selectedService.name,
          date: selectedDate,
          hour: `${selectedHour}:00`,
          customer_name: name,
          customer_email: email,
          status: "confirmed",
          deposit_paid: false,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        setIsProcessing(false);
        return;
      }

      setSuccess("Reserva creada con éxito. ¡Te esperamos!");
      setIsProcessing(false);
      return;
    }

    // Caso con seña
    const depositAmount = calculateDepositAmount();
    if (!depositAmount) {
      setError("La seña configurada no es válida.");
      setIsProcessing(false);
      return;
    }

    const { data, error: fnError } = await supabase.functions.invoke(
      "create-mercadopago-checkout",
      {
        body: {
          business_id: business.id,
          amount: depositAmount,
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

    if (fnError) {
      setError("No se pudo iniciar el pago de la seña.");
      setIsProcessing(false);
      return;
    }

    const checkoutUrl = data?.init_point || data?.url;
    if (!checkoutUrl) {
      setError("No se recibió la URL de pago.");
      setIsProcessing(false);
      return;
    }

    window.location.href = checkoutUrl;
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

  // ────────────────────────────────────────────────
  // UI APPLE
  // ────────────────────────────────────────────────
  const depositAmount = calculateDepositAmount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-lg mx-auto space-y-8">

        {/* HEADER */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            {business.name}
          </h1>

          {business.address && (
            <p className="text-xs text-slate-400 mt-1">{business.address}</p>
          )}
        </div>

        {/* FORMULARIO */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-xl p-6 space-y-6"
        >
          {/* Servicio */}
          <div>
            <label className="text-[12px] text-slate-300">Servicio</label>
            <select
              className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
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
          </div>

          {/* Fecha */}
          <div>
            <label className="text-[12px] text-slate-300">Fecha</label>
            <input
              type="date"
              className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Horarios */}
          <div>
            <label className="text-[12px] text-slate-300">Horario</label>
            <select
              className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
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
          </div>

          {/* Seña */}
          {usesDeposit && selectedService && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              <p className="font-semibold">Seña requerida</p>
              <p>
                Para confirmar el turno aboná:{" "}
                <span className="font-bold text-emerald-300">
                  ${depositAmount}
                </span>
              </p>
            </div>
          )}

          {/* Datos personales */}
          <div>
            <label className="text-[12px] text-slate-300">
              Tus datos
            </label>

            <input
              type="text"
              className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm mb-2"
              placeholder="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="email"
              className="w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
              placeholder="Tu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[12px] text-rose-300">
              {error}
            </p>
          )}

          {/* Success */}
          {success && (
            <p className="text-[12px] text-emerald-300">
              {success}
            </p>
          )}

          {/* BOTÓN */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full rounded-2xl bg-emerald-400 text-slate-950 font-semibold text-sm py-3 hover:bg-emerald-300 disabled:opacity-60 transition"
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
