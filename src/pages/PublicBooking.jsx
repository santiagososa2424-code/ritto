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
    try {
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
    } catch (err) {
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
      (s) => String(s.day_of_week || "").toLowerCase() === dayOfWeekName
    );

    if (todays.length === 0) return setAvailableHours([]);

    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("business_id", business.id)
      .eq("date", selectedDate);

    const takenHours = bookings?.map((b) => b.hour) || [];

    const hours = [];

    todays.forEach((slot) => {
      let current = slot.start_time.slice(0, 5);
      const end = slot.end_time.slice(0, 5);

      while (current < end) {
        const normalized = current.endsWith(":00") ? current : `${current}:00`;
        if (!takenHours.includes(normalized)) hours.push(current);

        current = addMinutes(current, Number(selectedService.duration || 0));
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

  const usesDeposit =
    business?.deposit_enabled && Number(business.deposit_value) > 0;

  const calculateDepositAmount = () => {
    if (!usesDeposit || !selectedService) return 0;

    const value = Number(business.deposit_value);
    const price = Number(selectedService.price);

    return business.deposit_type === "percentage"
      ? Math.round((price * value) / 100)
      : value;
  };

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
      setError("Completa todos los campos.");
      return;
    }

    setIsProcessing(true);

    try {
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

        if (insertError) throw insertError;

        setSuccess("Reserva confirmada. ¡Te esperamos!");
        setIsProcessing(false);
        return;
      }

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

      if (fnError) throw fnError;

      const checkoutUrl = data?.init_point || data?.url;
      window.location.href = checkoutUrl;
    } catch (err) {
      setError("No se pudo completar la reserva.");
      setIsProcessing(false);
    }
  };

  if (!business) return <div className="p-6 text-center">{error}</div>;

  const depositAmount = calculateDepositAmount();

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">

      {/* HEADER DEL NEGOCIO */}
      <div className="w-full max-w-2xl bg-white shadow-md rounded-xl p-6 mb-6">
        <h1 className="text-3xl font-bold text-blue-700">{business.name}</h1>
        {business.address && (
          <p className="text-sm text-gray-600 mt-1">{business.address}</p>
        )}
        {business.phone && (
          <p className="text-sm text-gray-600">{business.phone}</p>
        )}
        <p className="text-sm text-gray-500 mt-3">
          Reservá tu turno en pocos pasos:
        </p>
      </div>

      {/* FORMULARIO */}
      <div className="w-full max-w-2xl bg-white shadow-lg p-6 rounded-xl">
        <form className="space-y-6" onSubmit={handleSubmit}>

          {/* Servicio */}
          <div>
            <label className="block text-sm font-medium mb-1">Servicio</label>
            <select
              className="border p-2 w-full rounded-lg"
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
              className="border p-2 w-full rounded-lg"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Horario */}
          <div>
            <label className="block text-sm font-medium mb-1">Horarios disponibles</label>
            <select
              className="border p-2 w-full rounded-lg"
              value={selectedHour}
              onChange={(e) => setSelectedHour(e.target.value)}
            >
              <option value="">Elegí un horario</option>
              {availableHours.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            {selectedDate && selectedService && availableHours.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No hay horarios disponibles.
              </p>
            )}
          </div>

          {/* Seña */}
          {usesDeposit && selectedService && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-semibold text-blue-800 mb-1">Seña requerida</p>
              <p className="text-gray-700">
                Para confirmar tu turno deberás abonar
                {" "}
                <b>${depositAmount}</b>
                {business.deposit_type === "percentage" &&
                  ` (${business.deposit_value}% del servicio)`}
                .
              </p>
            </div>
          )}

          {/* Datos del cliente */}
          <div>
            <label className="block text-sm font-medium mb-1">Tus datos</label>
            <input
              type="text"
              placeholder="Nombre completo"
              className="border rounded-lg w-full p-2 mb-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="email"
              placeholder="Tu email"
              className="border rounded-lg w-full p-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Errores */}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}

          {/* BOTÓN */}
          <button
            type="submit"
            disabled={isProcessing}
            className="bg-blue-700 hover:bg-blue-800 text-white w-full p-3 rounded-lg font-semibold transition disabled:opacity-50"
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
