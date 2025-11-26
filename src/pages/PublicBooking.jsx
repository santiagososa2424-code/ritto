// ⚡⚡ CÓDIGO COMPLETO ACTUALIZADO CON CAPACIDAD POR HORARIO ⚡⚡

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function PublicBooking() {
  const { slug } = useParams();

  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [schedules, setSchedules] = useState([]);

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

  const loadData = async () => {
    setError("");

    try {
      // NEGOCIO
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

      // SERVICIOS
      const { data: servs } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", biz.id)
        .eq("is_active", true);

      setServices(servs || []);

      // HORARIOS
      const { data: scheds } = await supabase
        .from("schedules")
        .select("*")
        .eq("business_id", biz.id);

      setSchedules(scheds || []);
    } catch (err) {
      console.error(err);
      setError("Error cargando datos.");
    }
  };

  useEffect(() => {
    if (selectedDate && selectedService) {
      calculateAvailableHours();
    } else {
      setAvailableHours([]);
    }
  }, [selectedDate, selectedService]);

  const calculateAvailableHours = async () => {
    if (!business || !selectedService || !selectedDate) return;

    const dayOfWeekName = new Date(selectedDate)
      .toLocaleDateString("es-UY", { weekday: "long" })
      .toLowerCase();

    const todays = schedules.filter(
      (s) => (s.day_of_week || "").toLowerCase() === dayOfWeekName
    );

    if (todays.length === 0) {
      setAvailableHours([]);
      return;
    }

    // RESERVAS EXISTENTES
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
        const normalized = current.endsWith(":00") ? current : `${current}:00`;

        // ⚡ CAPACIDAD POR HORARIO
        const takenThisHour = bookings?.filter((b) => b.hour === normalized).length;
        const capacity = business.capacity_per_slot || 1;

        if (takenThisHour < capacity) {
          hours.push(current);
        }

        // sumar duración del servicio
        const step = Number(selectedService.duration);
        current = addMinutes(current, step);
      }
    });

    setAvailableHours(hours);
  };

  const addMinutes = (time, mins) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h);
    d.setMinutes(m + mins);
    return d.toISOString().slice(11, 16);
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedService || !selectedDate || !selectedHour || !name.trim() || !email.trim()) {
      setError("Completa todos los campos para reservar.");
      return;
    }

    if (!business) {
      setError("Negocio no encontrado.");
      return;
    }

    setIsProcessing(true);

    try {
      if (!usesDeposit) {
        await supabase.from("bookings").insert({
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

        setSuccess("Reserva creada con éxito. ¡Te esperamos!");
        setIsProcessing(false);
        return;
      }

      const depositAmount = calculateDepositAmount();

      const { data } = await supabase.functions.invoke(
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

      const checkoutUrl = data?.init_point || data?.url;
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error(err);
      setError("Error procesando la reserva.");
      setIsProcessing(false);
    }
  };

  if (!business) {
    return <div className="p-6 max-w-lg mx-auto">{error || "Cargando negocio..."}</div>;
  }

  const depositAmount = calculateDepositAmount();

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">{business.name}</h1>
      <p className="text-sm text-gray-600 mb-4">Reservá tu turno en pocos pasos.</p>

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
          <label className="block text-sm font-medium mb-1">Horarios disponibles</label>
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
        </div>

        {/* Datos */}
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

        {/* Seña */}
        {usesDeposit && selectedService && (
          <div className="border rounded p-3 bg-gray-50 text-sm">
            <p className="font-semibold mb-1">Seña requerida</p>
            <p>
              Deberás pagar una seña de{" "}
              <span className="font-bold">${depositAmount}</span>
            </p>
          </div>
        )}

        {/* Botón */}
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
