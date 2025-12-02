import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Schedule() {
  const [business, setBusiness] = useState(null);
  const [schedules, setSchedules] = useState([]);

  const [day, setDay] = useState("Lunes");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState(1);

  const [slotInterval, setSlotInterval] = useState(30);
  const [workingDays, setWorkingDays] = useState({
    Lunes: true,
    Martes: true,
    Miércoles: true,
    Jueves: true,
    Viernes: true,
    Sábado: true,
    Domingo: false,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  // ------------------------------------
  // 🔥 Cargar datos iniciales
  // ------------------------------------
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
    if (biz.slot_interval_minutes) setSlotInterval(biz.slot_interval_minutes);
    if (biz.working_days) setWorkingDays(biz.working_days);

    const { data: scheduleData } = await supabase
      .from("schedules")
      .select("*")
      .eq("business_id", biz.id)
      .order("day_of_week");

    setSchedules(scheduleData || []);
  };

  // ------------------------------------
  // 💾 Guardar configuración general
  // ------------------------------------
  const saveBusinessSettings = async () => {
    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        slot_interval_minutes: slotInterval,
        working_days: workingDays,
      })
      .eq("id", business.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Configuración guardada.");
    loadData();
  };

  // ------------------------------------
  // ↔️ Solape de horarios
  // ------------------------------------
  const overlap = (aStart, aEnd, bStart, bEnd) => {
    return aStart < bEnd && bStart < aEnd;
  };

  // ------------------------------------
  // ➕ Agregar horario
  // ------------------------------------
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

    const sameDay = schedules.filter((s) => s.day_of_week === day);

    for (let s of sameDay) {
      if (overlap(newStart, newEnd, s.start_time, s.end_time)) {
        setError("Este horario se superpone con uno existente.");
        return;
      }
    }

    const { error: insertError } = await supabase.from("schedules").insert({
      business_id: business.id,
      day_of_week: day,
      start_time: newStart,
      end_time: newEnd,
      capacity_per_slot: capacity,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess("Horario agregado.");
    setStartTime("");
    setEndTime("");
    setCapacity(1);
    loadData();
  };

  // ------------------------------------
  // ❌ Eliminar horario
  // ------------------------------------
  const deleteSchedule = async (id) => {
    await supabase.from("schedules").delete().eq("id", id);
    loadData();
  };

  // ------------------------------------
  // 🖥️ UI
  // ------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* TÍTULO PRINCIPAL */}
        <Header
          title="Horarios del negocio"
          subtitle="Configurá los días y horarios disponibles para tus clientes."
        />

        {/* ALERTAS */}
        {error && <Alert type="error" text={error} />}
        {success && <Alert type="success" text={success} />}

        {/* CARD — CONFIGURACIÓN GENERAL */}
        <Card title="Configuración general">
          {/* DÍAS */}
          <Field label="Días que trabaja el negocio">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {Object.keys(workingDays).map((d) => (
                <label
                  key={d}
                  className="flex items-center gap-2 text-[12px] text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={workingDays[d]}
                    onChange={(e) =>
                      setWorkingDays({ ...workingDays, [d]: e.target.checked })
                    }
                  />
                  {d}
                </label>
              ))}
            </div>
          </Field>

          {/* INTERVALO BASE */}
          <Field label="Intervalo base">
            <select
              className="input-ritto"
              value={slotInterval}
              onChange={(e) => setSlotInterval(Number(e.target.value))}
            >
              <option value={15}>Cada 15 min</option>
              <option value={20}>Cada 20 min</option>
              <option value={30}>Cada 30 min (recomendado)</option>
              <option value={45}>Cada 45 min</option>
              <option value={60}>Cada 60 min</option>
            </select>
          </Field>

          <button
            onClick={saveBusinessSettings}
            className="button-ritto w-full mt-2"
          >
            Guardar configuración
          </button>
        </Card>

        {/* CARD — AGREGAR HORARIO */}
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
              {Object.keys(workingDays).map((d) => (
                <option key={d}>{d}</option>
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
              placeholder="Capacidad"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />

            <button className="button-ritto">Agregar</button>
          </form>
        </Card>

        {/* CARD — LISTA DE HORARIOS */}
        <Card title="Horarios creados">
          {schedules.length === 0 && (
            <p className="text-sm text-slate-400">No hay horarios aún.</p>
          )}

          <ul className="space-y-3 mt-3">
            {schedules.map((s) => (
              <li
                key={s.id}
                className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow p-5 flex items-center justify-between"
              >
                <span className="font-medium text-slate-50 text-sm">
                  {s.day_of_week}: {s.start_time.slice(0, 5)} –{" "}
                  {s.end_time.slice(0, 5)}{" "}
                  <span className="text-emerald-300 text-xs">
                    (capacidad: {s.capacity_per_slot || 1})
                  </span>
                </span>

                <button
                  onClick={() => deleteSchedule(s.id)}
                  className="text-sm px-4 py-1.5 rounded-2xl border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 transition"
                >
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// ------------------------------------------
// 🎨 SUB-COMPONENTES
// ------------------------------------------

function Header({ title, subtitle }) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
        {title}
      </h1>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-xl p-6 space-y-6">
      <h2 className="text-lg font-semibold text-emerald-300 tracking-tight">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[12px] text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function Alert({ type, text }) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 text-[12px] ${
        type === "error"
          ? "border border-rose-500/40 bg-rose-500/10 text-rose-200"
          : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      }`}
    >
      {text}
    </div>
  );
}
