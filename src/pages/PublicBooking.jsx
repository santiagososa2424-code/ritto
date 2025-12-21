import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function PublicBooking() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
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

    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (!biz) {
      setError("No existe un negocio con ese enlace.");
      return;
    }

    setBusiness(biz);

    const [{ data: servs }, { data: scheds }, { data: blks }] =
      await Promise.all([
        supabase
          .from("services")
          .select("*")
          .eq("business_id", biz.id)
          .eq("is_active", true),
        supabase.from("schedules").select("*").eq("business_id", biz.id),
        supabase.from("schedule_blocks").select("*").eq("business_id", biz.id),
      ]);

    setServices(servs || []);
    setSchedules(scheds || []);
    setBlocks(blks || []);
  };

  useEffect(() => {
    if (selectedDate && selectedService) {
      calculateSlots();
    } else {
      setSlots([]);
    }
  }, [selectedDate, selectedService]);

  const calculateSlots = async () => {
    const dateStr = selectedDate;

    if (blocks.some((b) => b.date === dateStr)) {
      setSlots([]);
      return;
    }

    const dayName = new Date(selectedDate).toLocaleDateString("es-UY", {
      weekday: "long",
    });

    const todays = schedules.filter((s) => s.day_of_week === dayName);
    if (!todays.length) {
      setSlots([]);
      return;
    }

    const { data: bks } = await supabase
      .from("bookings")
      .select("hour")
      .eq("business_id", business.id)
      .eq("date", dateStr);

    setBookings(bks || []);

    const interval = Math.max(
      business.slot_interval_minutes || 30,
      selectedService.duration
    );

    const result = [];

    todays.forEach((s) => {
      let current = s.start_time.slice(0, 5);
      const end = s.end_time.slice(0, 5);

      while (current < end) {
        const normalized = `${current}:00`;
        const used =
          bks?.filter((b) => b.hour === normalized).length || 0;

        result.push({
          hour: current,
          available: used < (s.capacity_per_slot || 1),
        });

        current = addMinutes(current, interval);
      }
    });

    setSlots(result);
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

    if (business.deposit_type === "percentage") {
      return Math.round(
        (selectedService.price * business.deposit_value) / 100
      );
    }
    return Number(business.deposit_value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !selectedService ||
      !selectedDate ||
      !selectedHour ||
      !name ||
      !email
    ) {
      setError("Completá todos los campos.");
      return;
    }

    setIsProcessing(true);

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

    const amount = calculateDepositAmount();

    const { data } = await supabase.functions.invoke(
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

    window.location.href = data.init_point;
  };

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8">
      {/* FLECHA */}
      <button
        onClick={() => navigate("/dashboard")}
        className="mb-4 text-sm text-slate-400 hover:text-white"
      >
        ← Volver al panel
      </button>

      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold">{business.name}</h1>
          <p className="text-xs text-slate-400">
            Elegí servicio, fecha y horario
          </p>
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
                  {s.name} · {s.duration} min · ${s.price}
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
            <div className="grid grid-cols-3 gap-2">
              {slots.map((s) => (
                <button
                  key={s.hour}
                  type="button"
                  disabled={!s.available}
                  onClick={() => setSelectedHour(s.hour)}
                  className={`py-2 rounded-xl text-sm ${
                    s.available
                      ? selectedHour === s.hour
                        ? "bg-emerald-400 text-black"
                        : "bg-blue-500/20 text-blue-300 hover:bg-blue-500/40"
                      : "bg-white/5 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {s.hour}
                </button>
              ))}
            </div>
          </Field>

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

          {usesDeposit && selectedService && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-3 text-sm">
              Seña requerida: <strong>${calculateDepositAmount()}</strong>
            </div>
          )}

          {error && <Alert error text={error} />}
          {success && <Alert success text={success} />}

          <button
            disabled={isProcessing}
            className="button-ritto w-full"
          >
            {usesDeposit ? "Ir a pagar seña" : "Confirmar reserva"}
          </button>
        </form>
      </div>
    </div>
  );
}

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
      className={`rounded-xl px-4 py-2 text-xs ${
        error
          ? "bg-rose-500/10 border border-rose-500/40 text-rose-200"
          : "bg-emerald-500/10 border border-emerald-500/40 text-emerald-200"
      }`}
    >
      {text}
    </div>
  );
}
