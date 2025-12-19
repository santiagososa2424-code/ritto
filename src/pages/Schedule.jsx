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

export default function Schedule() {
  const [business, setBusiness] = useState(null);
  const [schedules, setSchedules] = useState([]);

  const [day, setDay] = useState("lunes");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState(1);

  const [slotInterval, setSlotInterval] = useState(30);
  const [workingDays, setWorkingDays] = useState({
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: true,
    domingo: false,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  /* ─────────────────────────────
     CARGA INICIAL
  ───────────────────────────── */
  const loadData = async () => {
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    if (biz.slot_interval_minutes)
      setSlotInterval(biz.slot_interval_minutes);

    if (biz.working_days)
      setWorkingDays(biz.working_days);

    const { data } = await supabase
      .from("schedules")
      .select("*")
      .eq("business_id", biz.id)
      .order("day_of_week");

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
        working_days: workingDays,
      })
      .eq("id", business.id);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Configuración guardada.");
    loadData();
  };

  /* ─────────────────────────────
     AGREGAR HORARIO
  ───────────────────────────── */
  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!startTime || !endTime) {
      setError("Completá todos los campos.");
      return;
    }

    if (!workingDays[day]) {
      setError("Este día está deshabilitado.");
      return;
    }

    const newStart = startTime + ":00";
    const newEnd = endTime + ":00";

    const sameDay = schedules.filter(
      (s) => s.day_of_week === day
    );

    for (let s of sameDay) {
      if (newStart < s.end_time && s.start_time < newEnd) {
        setError("El horario se superpone con otro existente.");
        return;
      }
    }

    const { error } = await supabase.from("schedules").insert({
      business_id: business.id,
      day_of_week: day,
      start_time: newStart,
      end_time: newEnd,
      capacity_per_slot: capacity,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Horario agregado.");
    setStartTime("");
    setEndTime("");
    setCapacity(1);
    loadData();
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

        <Card title="Configuración general">
          <Field label="Días de trabajo">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.keys(DAYS).map((d) => (
                <label key={d} className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={workingDays[d]}
                    onChange={(e) =>
                      setWorkingDays({
                        ...workingDays,
                        [d]: e.target.checked,
                      })
                    }
                  />
                  {DAYS[d]}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Intervalo base">
            <select
              className="input-ritto"
              value={slotInterval}
              onChange={(e) =>
                setSlotInterval(Number(e.target.value))
              }
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>60 min</option>
            </select>
          </Field>

          <button onClick={saveBusinessSettings} className="button-ritto">
            Guardar configuración
          </button>
        </Card>

        <Card title="Agregar horario">
          <form
            onSubmit={handleAdd}
            className="grid grid-cols-1 sm:grid-cols-5 gap-4"
          >
            <select
              className="input-ritto"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            >
              {Object.keys(workingDays)
                .filter((d) => workingDays[d])
                .map((d) => (
                  <option key={d} value={d}>
                    {DAYS[d]}
                  </option>
                ))}
            </select>

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
              onChange={(e) => setCapacity(+e.target.value)}
            />

            <button className="button-ritto">Agregar</button>
          </form>
        </Card>

        <Card title="Horarios creados">
          {schedules.map((s) => (
            <div
              key={s.id}
              className="flex justify-between items-center border p-4 rounded-xl"
            >
              <span>
                {DAYS[s.day_of_week]} · {s.start_time.slice(0,5)}–{s.end_time.slice(0,5)}
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
    <div className={`p-3 rounded-xl ${
      type === "error"
        ? "bg-red-500/10 text-red-300"
        : "bg-emerald-500/10 text-emerald-300"
    }`}>
      {text}
    </div>
  );
}
