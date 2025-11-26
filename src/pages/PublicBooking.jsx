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

  // ----------------------------------
  // CARGAR DATOS DEL NEGOCIO
  // ----------------------------------
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

  // ----------------------------------
  // REGENERAR HORARIOS DISPONIBLES
  // ----------------------------------
  useEffect(() => {
    if (selectedDate && selectedService) {
      calculateAvailableHours();
    } else {
      setAvailableHours([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedService]);

  const calculateAvailableHours = async () => {
    if (!business || !selectedService || !selectedDate) return;

    const todayStr = new Date(selectedDate).toISOString().slice(0, 10);

    // Día bloqueado completamente
    const isBlocked = blocks.some((b) => b.date === todayStr);
    if (isBlocked) {
      setAvailableHours([]);
      return;
    }

    // Nombre del día: lunes, martes, etc.
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

    // Reservas existentes para ese día
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

        // capacidad por franja (columna capacity_per_slot en schedules, default 1)
        const capacity = slot.capacity_per_slot || 1;

        if (countThisHour < capacity) {
          hours.push(current);
        }

        // sumamos la duración del servicio
        current = addMinutes(current, selectedService.duration);
      }
    });

    setAvailableHours(hours);
  };

  const addMinutes = (time, mins) => {
    const [h, m] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(h);
    d.setMinutes(m + Number(mins || 0));
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  // ----------------------------------
  // SEÑA (DEPOSIT)
  // ----------------------------------
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

  // ----------------------------------
  // GUARDAR RESERVA
  // ----------------------------------
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
      // ⚡ CASO 1: SIN SEÑA → insert + email inmediato
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
          console.error(insertError);
          setError(insertError.message);
          setIsProcessing(false);
          return;
        }

        // ⚡ Enviar email de confirmación (Resend)
        try {
          await supabase.functions.invoke("send-booking-confirmation", {
            body: {
              to: email,
              customer_name: name,
              business_name: business.name,
              business_address: business.address,
              business_slug: business.slug,
              map_url: business.map_url,
              date: selectedDate,
              hour: inserted.hour || `${selectedHour}:00`,
              service_name: selectedService.name,
            },
          });
        } catch (mailErr) {
          console.error("Error enviando email de confirmación:", mailErr);
          // No tiramos error al usuario si falla el mail, la reserva ya está hecha
        }

        setSuccess("Reserva creada con éxito. ¡Te esperamos!");
        setIsProcessing(false);
        return;
      }

      // ⚡ CASO 2: CON SEÑA → Mercado Pago (email lo agregamos cuando
      // integremos bien el webhook de pago para no romper tu flujo actual)
      const depositAmount = calculateDepositAmount();

      if (!depositAmount || depositAmount <= 0) {
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
        console.error(fnError);
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
    } catch (err) {
      console.error(err);
      setError("Error al procesar la reserva.");
    }

    setIsProcessing(false);
  };

  // ----------------------------------
  // UI
  // ----------------------------------
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
      <h1 className="text-2xl font-bold mb-2">{business.name}</h1>
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

        {/* Horario */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Horario disponible
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
                No hay horarios disponibles para ese día.
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

        {/* Tus datos */}
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
          className="bg-black text-white px-4 py-2 rounded font-semibold w-full disabled:opacity-60"
          disabled={isProcessing}
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
