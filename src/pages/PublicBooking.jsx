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
  const [phone, setPhone] = useState("");

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

    // cargar servicios del negocio
    const { data: servs } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", biz.id);

    setServices(servs || []);

    // cargar horarios del negocio
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

    // horarios del día elegido
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

    if (!selectedService || !selectedDate || !selectedHour) {
      setError("Completa todos los campos.");
      return;
    }

    const { error: insertError } = await supabase.from("bookings").insert({
      business_id: business.id,
      service_id: selectedService.id,
      date: selectedDate,
      hour: selectedHour + ":00",
      customer_name: name,
      customer_phone: phone,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess("Reserva creada con éxito.");
    setName("");
    setPhone("");
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

      <h2 className="text-xl font-semibold m
