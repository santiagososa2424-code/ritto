import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────
   DÍAS NORMALIZADOS
───────────────────────────── */
const DAYS = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes",
  sabado: "Sábado",
  domingo: "Domingo",
};

const DAY_KEYS = Object.keys(DAYS);
const INTERVAL_OPTIONS = [15, 30, 45, 60];

export default function Schedule() {
  const [business, setBusiness] = useState(null);
  const [schedules, setSchedules] = useState([]);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState(1);

  // ✅ MULTI-SELECT REAL PARA AGREGAR HORARIO
  const [selectedDays, setSelectedDays] = useState([]);

  const [slotInterval, setSlotInterval] = useState(30);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  /* ─────────────────────────────
     CARGA INICIAL
  ───────────────────────────── */
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (!biz) {
      navigate("/setup");
      return;
    }

    setBusiness(biz);

    if (biz.slot_interval_minutes) {
      setSlotInterval(biz.slot_interval_minutes);
    }

    const { data } = await supabase
      .from("schedules")
      .select("*")
      .eq("business_id", biz.id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    setSchedules(data || []);
  };

  /* ─────────────────────────────
     GUARDAR CONFIG GENERAL
  ───────────────────────────── */
  const saveBusinessSettings = async () => {
    const { error } = await supabase
      .from("businesses")
      .update({
        slot_interval_minutes: slotInterval,
      })
      .eq("id", business.id);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Configuración guardada.");
  };

  /* ─────────────────────────────
     AGREGAR HORARIOS
  ───────────────────────────── */
  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!startTime || !endTime || selectedDays.length === 0) {
      setError("Completá todos los campos y seleccioná al menos un día.");
      return;
    }

    const newStart = startTime + ":00";
    const newEnd = endTime + ":00";

    // validar solapamientos
    for (let day of selectedDays) {
      const sameDay = schedules.filter((s) => s.day_of_week === day);

      for (let s of sameDay) {
        if (newStart < s.end_time && s.start_time < newEnd) {
          setError(`El horario se superpone el ${DAYS[day]}.`);
          return;
        }
      }
    }

    const rows = selectedDays.map((day) => ({
      business_id: business.id,
      day_of_week: day,
      start_time: newStart,
      end_time: newEnd,
      capacity_per_slot: capacity,
    }));

    const { error } = await supabase.from("schedules").insert(rows);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Horarios creados correctamente.");
    setStartTime("");
    setEndTime("");
    setCapacity(1);
    setSelectedDays([]);
    loadData();
  };

  const toggleDay = (day) => {
    setSelectedDays((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day]
    );
  };

  const deleteSchedule = async (id) => {
    await supabase.from("schedules").delete().eq("id", id);
    loadData();
  };

  /* ─────────────────────────────
     UI
  ───────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-10">
        <h1 className="text-3xl font-semibold text-center">
          Horarios del negocio
        </h1>

        {error && <Alert type="error" text={error} />}
        {success && <Alert type="success" text={success} />}

        {/* CONFIG GENERAL */}
        <Card title="Configuración general">
          <Field label="Intervalo base">
            <div className="flex flex-wrap gap-2">
              {INTERVAL_OPTIONS.map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setSlotInterval(min)}
                  className={`px-4 py-2 rounded-full border text-sm transition ${
                    slotInterval === min
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-blue-500 text-blue-300 hover:bg-blue-500/10"
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
          </Field>

          <button onClick={saveBusinessSettings} className="button-ritto">
            Guardar configuración
          </button>
        </Card>

        {/* AGREGAR HORARIO */}
        <Card title="Agregar horario">
          <form
            onSubmit={handleAdd}
            className="grid grid-cols-1 sm:grid-cols-5 gap-4"
          >
            <input
              type="time"
              className="input-ritto"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />

            <input
              type="time"
              className="input-ritto"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />

            <input
              type="number"
              min={1}
              className="input-ritto"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />

            <button className="button-ritto col-span-2">Agregar</button>

            <div className="col-span-full">
              <p className="text-sm text-slate-400 mb-2">
                Aplicar a los días:
              </p>

              <div className="flex flex-wrap gap-2">
                {DAY_KEYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-4 py-2 rounded-full border text-sm transition ${
                      selectedDays.includes(day)
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-blue-500 text-blue-300 hover:bg-blue-500/10"
                    }`}
                  >
                    {DAYS[day]}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </Card>

        {/* HORARIOS CREADOS */}
        <Card title="Horarios creados">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="flex justify-between items-center border p-4 rounded-xl"
            >
              <span>
                {DAYS[s.day_of_week]} ·{" "}
                {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
              </span>
              <button
                onClick={() => deleteSchedule(s.id)}
                className="text-red-400"
              >
                Eliminar
              </button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

/* ───────── COMPONENTES ───────── */

function Card({ title, children }) {
  return (
    <div className="bg-slate-900 p-6 rounded-3xl space-y-4">
      <h2 className="text-lg text-emerald-300">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function Alert({ type, text }) {
  return (
    <div
      className={`p-3 rounded-xl ${
        type === "error"
          ? "bg-red-500/10 text-red-300"
          : "bg-emerald-500/10 text-emerald-300"
      }`}
    >
      {text}
    </div>
  );
}
