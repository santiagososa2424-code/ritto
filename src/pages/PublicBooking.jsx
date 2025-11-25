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

  useEffect(() => {
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("slug", slug)
      .single();

    if (!biz) return;

    setBusiness(biz);

    const { data: servs } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", biz.id);

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

  const handleBooking = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedService || !selectedDate || !selectedHour || !name || !email) {
      setError("Completa todos los campos.");
      return;
    }

    // Crear la reserva
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
      return;
    }

    // EMAIL INMEDIATO
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

    // EMAIL RECORDATORIO 24H ANTES
    const reminderDate = new Date(selectedDate + "T" + selectedHour + ":00");
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
  };

  if (!business) return <p>Cargando...</p>;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">{business.name}</h1>

      <h2 className="text-xl font-semibold mb-2">Elegí un servicio</h2>

      <select
        className="border p-2 rounded mb-4 w-full"
        onChange={(e) =>
          setSelectedService(services.find((s) => s.id === e.target.value))
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
      {availableHours.length === 0 && <p>No hay horarios para este día.</p>}
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

        {error && <p className="text-red-600">{error}</p>}
        {success && <p className="text-green-600">{success}</p>}

        <button
          type="submit"
          className="bg-black text-white p-2 rounded font-semibold"
        >
          Reservar
        </button>
      </form>
    </div>
  );
}
