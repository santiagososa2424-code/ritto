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

  // -------------------------------------------------
  // CARGAR TODO DEL NEGOCIO
  // -------------------------------------------------
  const loadData = async () => {
    try {
      setError("");

      // Negocio
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

      // Servicios activos
      const { data: servs } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", biz.id)
        .eq("is_active", true);

      setServices(servs || []);

      // Horarios del negocio
      const { data: scheds } = await supabase
        .from("schedules")
        .select("*")
        .eq("business_id", biz.id);

      setSchedules(scheds || []);

      // Bloqueos
      const { data: blks } = await supabase
        .from("schedule_blocks")
        .select("*")
        .eq("business_id", biz.id);

      setBlocks(blks || []);
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error cargando el negocio.");
    }
  };

  // -------------------------------------------------
  // REGENERAR HORARIOS DISPONIBLES
  // -------------------------------------------------
  useEffect(() => {
    if (selectedDate && selectedService) {
      calculateAvailableHours();
    } else {
      setAvailableHours([]);
    }
  }, [selectedDate, selectedService]);

  const calculateAvailableHours = async () => {
    if (!business || !selectedService || !selectedDate) return;

    const today = new Date(selectedDate).toISOString().slice(0, 10);

    // 🔥 bloquear fechas específicas
    const isBlocked = blocks.some((b) => b.date === today);
    if (isBlocked) {
      setAvailableHours([]);
      return;
    }

    // 🔥 bloquear días no laborales
    const dayName = new Date(selectedDate)
      .toLocaleDateString("es-UY", { weekday: "long" })
      .charAt(0)
      .toUpperCase() +
      new Date(selectedDate)
        .toLocaleDateString("es-UY", { weekday: "long" })
        .slice(1)
        .toLowerCase();

    if (!business.working_days?.[dayName]) {
      setAvailableHours([]);
      return;
    }

    // Horarios creados
    const todays = schedules.filter(
      (s) => s.day_of_week.toLowerCase() === dayName.toLowerCase()
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
        const normalizedHour = `${current}:00`;

        // capacidad
        const taken = bookings?.filter((b) => b.hour === normalizedHour).length || 0;
        const capacity = slot.capacity_per_slot || 1;

        if (taken < capacity) {
          hours.push(current);
        }

        // sumar duración del servicio
        current = addMinutes(current, selectedService.duration);
      }
    });

    setAvailableHours(hours);
  };

  const addMinutes = (time, mins) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h);
    d.setMinutes(m + mins);

    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  };

  // -------------------------------------------------
  // SEÑA
  // -------------------------------------------------
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

  // -------------------------------------------------
  // CREAR RESERVA
  // -------------------------------------------------
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

    try {
      // 🔵 SIN SEÑA
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

      // 🟣 CON SEÑA → MERCADO PAGO
      const depositAmount = calculateDepositAmount();

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
        setError("Error recibiendo URL de pago.");
        setIsProcessing(false);
        return;
      }

      window.location.href = checkoutUrl;
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al procesar la reserva.");
    }

    setIsProcessing(false);
  };

  // -------------------------------------------------
  // UI
  // -------------------------------------------------
  if (!business) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        {error || "Cargando negocio..."}
      </div>
    );
  }

  const depositAmount = calculateDepositAmount();

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-2">{business.name}</h1>

      {/* Dirección + mapa */}
      {business.address && (
        <p className="text-gray-700 mb-1">📍 {business.address}</p>
      )}

      {business.map_url && (
        <a
          href={business.map_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline text-sm mb-4 inline-block"
        >
          Ver en Google Maps
        </a>
      )}

      <p className="text-sm text-gray-600 mb-4">
        Reservá tu turno en pocos pasos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Servicio */}
        <div>
          <label className="block text-sm font-medium mb-1">Servicio</label>
          <select
            className="border rounded w-full p-2"
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
          <label className="block text-sm font-medium mb-1">Fecha</label>
          <input
            type="date"
            className="border rounded w-full p-2"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Horarios */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Horarios disponibles
          </label>

          <select
            className="border rounded w-full p-2"
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
              <p className="text-xs text-gray-500 mt-1">
                No hay horarios disponibles.
              </p>
            )}
        </div>

        {/* Seña */}
        {usesDeposit && selectedService && (
          <div className="border rounded p-3 bg-gray-50 text-sm">
            <p className="font-semibold mb-1">Seña requerida</p>
            <p>
              Para confirmar tu turno, aboná una seña de{" "}
              <span className="font-bold">${depositAmount}</span>{" "}
              {business.deposit_type === "percentage" &&
                `(${business.deposit_value}% del servicio)`}.
            </p>
          </div>
        )}

        {/* Datos usuario */}
        <div>
          <label className="block text-sm font-medium mb-1">Tus datos</label>

          <input
            type="text"
            className="border rounded w-full p-2 mb-2"
            placeholder="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="email"
            className="border rounded w-full p-2"
            placeholder="Tu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button
          type="submit"
          disabled={isProcessing}
          className="bg-black text-white px-4 py-2 rounded font-semibold w-full disabled:opacity-60"
        >
          {isProcessing
            ? "Procesando..."
            : usesDeposit
            ? "Ir a pagar la seña"
            : "Confirmar reserva"}
        </button>
      </form>
    </div>
  );
}
