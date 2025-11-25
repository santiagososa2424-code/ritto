import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useParams } from "react-router-dom";

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
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
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

    const { data: servs } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", biz.id)
      .eq("is_active", true);

    setServices(servs || []);

    const { data: sched } = await supabase
      .from("schedules")
      .select("*")
      .eq("business_id", biz.id);

    setSchedules(sched || []);
  };

  useEffect(() => {
    if (selectedDate && selectedService) {
      calculateAvailableHours();
    }
  }, [selectedDate, selectedService]);

  const calculateAvailableHours = async () => {
    if (!business || !selectedService || !selectedDate) return;

    const dayOfWeek = new Date(selectedDate).toLocaleDateString("es-UY", {
      weekday: "long",
    });

    const todaysSchedules = schedules.filter(
      (s) => s.day_of_week.toLowerCase() === capitalize(dayOfWeek)
    );

    if (todaysSchedules.length === 0) {
      setAvailableHours([]);
      return;
    }

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("business_id", business.id)
      .eq("date", selectedDate);

    const takenHours = bookings?.map((b) => b.hour) || [];

    const hours = [];

    todaysSchedules.forEach((slot) => {
      let current = slot.start_time.slice(0, 5);

      while (current < slot.end_time.slice(0, 5)) {
        if (!takenHours.includes(current + ":00")) {
          hours.push(current);
        }

        current = addMinutes(current, selectedService.duration);
      }
    });

    setAvailableHours(hours);
  };

  const addMinutes = (time, mins) => {
    const [h, m] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(h);
    date.setMinutes(m + mins);

    return date.toTimeString().slice(0, 5);
  };

  const capitalize = (s) =>
    s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const usesDeposit =
    business &&
    business.deposit_enabled &&
    Number(business.deposit_value) > 0;

  const calculateDepositAmount = () => {
    if (!usesDeposit || !selectedService) return 0;

    const price = Number(selectedService.price) || 0;
    const value = Number(business.deposit_value) || 0;

    if (business.deposit_type === "percentage") {
      return Math.round((price * value) / 100);
    }

    // Monto fijo
    return value;
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedService || !selectedDate || !selectedHour || !name || !email) {
      setError("Completa todos los campos.");
      return;
    }

    if (!business) {
      setError("No se encontró el negocio.");
      return;
    }

    setIsProcessing(true);

    try {
      if (!usesDeposit) {
        // 🔹 SIN SEÑA: crea reserva directo como antes
        const { data: bookingData, error: insertError } = await supabase
          .from("bookings")
          .insert({
            business_id: business.id,
            service_id: selectedService.id,
            service_name: selectedService.name,
            date: selectedDate,
            hour: selectedHour + ":00",
            customer_name: name,
            customer_email: email,
            status: "confirmed",
          })
          .select()
          .single();

        if (insertError) {
          setError(insertError.message);
          setIsProcessing(false);
          return;
        }

        // Email inmediato
        await supabase.from("email_queue").insert({
          to_email: email,
          subject: `Tu reserva en ${business.name} está confirmada`,
          body: `
Hola ${name},

Tu turno quedó confirmado:

📅 Fecha: ${selectedDate}
⏰ Hora: ${selectedHour}
💈 Servicio: ${selectedService.name}

¡Gracias por reservar con ${business.name}!
          `,
          send_at: new Date().toISOString(),
        });

        // Recordatorio 24h antes
        const reminderDate = new Date(
          selectedDate + "T" + selectedHour + ":00"
        );
        reminderDate.setHours(reminderDate.getHours() - 24);

        await supabase.from("email_queue").insert({
          to_email: email,
          subject: `Recordatorio de tu turno — ${business.name}`,
          body: `
Hola ${name},

Te recordamos que mañana tenés tu turno:

💈 ${selectedService.name}
📅 Día: ${selectedDate}
⏰ Hora: ${selectedHour}

¡Te esperamos!
          `,
          send_at: reminderDate.toISOString(),
        });

        setSuccess("Reserva creada con éxito.");
        setName("");
        setEmail("");
        setSelectedHour("");
        setIsProcessing(false);
        return;
      }

      // 🔹 CON SEÑA: ir a Mercado Pago ANTES de crear la reserva
      const depositAmount = calculateDepositAmount();

      if (!depositAmount || depositAmount <= 0) {
        setError("La seña configurada no es válida.");
        setIsProcessing(false);
        return;
      }

      const { data, error: mpError } = await supabase.functions.invoke(
        "create-mercadopago-checkout",
        {
          body: {
            business_id: business.id,
            service_id: selectedService.id,
            service_name: selectedService.name,
            service_price: selectedService.price,
            date: selectedDate,
            hour: selectedHour + ":00",
            customer_name: name,
            customer_email: email,
            deposit_enabled: business.deposit_enabled,
            deposit_type: business.deposit_type,
            deposit_value: business.deposit_value,
            deposit_amount: depositAmount,
            slug: business.slug,
          },
        }
      );

      if (mpError) {
        console.error(mpError);
        setError("No se pudo iniciar el pago de la seña.");
        setIsProcessing(false);
        return;
      }

      // El backend debe devolver la URL de pago (init_point o similar)
      const checkoutUrl =
        data?.init_point || data?.url || data?.sandbox_init_point;

      if (!checkoutUrl) {
        setError("No se recibió la URL de pago.");
        setIsProcessing(false);
        return;
      }

      // Redirigir a Mercado Pago
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al procesar la reserva.");
      setIsProcessing(false);
    }
  };

  if (!business) return <p className="p-6">Cargando...</p>;

  const depositAmount = calculateDepositAmount();

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">{business.name}</h1>
      <p className="text-sm text-gray-600 mb-4">
        Reservá tu turno de forma rápida y sencilla.
      </p>

      <h2 className="text-xl font-semibold mb-2">Elegí un servicio</h2>

      <select
        className="border p-2 rounded mb-4 w-full"
        onChange={(e) =>
          setSelectedService(
            services.find((s) => s.id === e.target.value)
          )
        }
      >
        <option value="">Seleccionar</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} — ${s.price}
          </option>
        ))}
      </select>

      <h2 className="text-xl font-semibold mb-2">Fecha</h2>
      <input
        type="date"
        className="border p-2 rounded mb-4 w-full"
        onChange={(e) => setSelectedDate(e.target.value)}
      />

      <h2 className="text-xl font-semibold mb-2">Horarios disponibles</h2>
      {availableHours.length === 0 && selectedDate && selectedService && (
        <p>No hay horarios para este día.</p>
      )}
      <select
        className="border p-2 rounded mb-4 w-full"
        onChange={(e) => setSelectedHour(e.target.value)}
      >
        <option value="">Seleccionar</option>
        {availableHours.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>

      {usesDeposit && selectedService && (
        <div className="mb-4 p-3 border rounded bg-gray-50 text-sm">
          <p className="font-semibold mb-1">Seña requerida</p>
          <p>
            Este negocio requiere una seña para confirmar tu turno.
            <br />
            Monto de la seña:{" "}
            <span className="font-bold">
              ${depositAmount} {business.deposit_type === "percentage" && `( ${business.deposit_value}% del servicio )`}
            </span>
          </p>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-2">Tus datos</h2>
      <form onSubmit={handleBooking} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Nombre"
          className="border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          className="border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <button
          type="submit"
          className="bg-black text-white p-2 rounded font-semibold disabled:opacity-60"
          disabled={isProcessing}
        >
          {isProcessing
            ? "Procesando..."
            : usesDeposit
            ? "Continuar al pago"
            : "Confirmar reserva"}
        </button>
      </form>
    </div>
  );
}
