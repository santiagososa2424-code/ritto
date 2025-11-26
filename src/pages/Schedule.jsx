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

  const overlap = (aStart, aEnd, bStart, bEnd) => {
    return aStart < bEnd && bStart < aEnd;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!startTime || !endTime) {
      setError("Completá todos los campos.");
      return;
    }

    if (!workingDays[day]) {
      setError("Este día está deshabilitado en la configuración.");
      return;
    }

    const newStart = startTime + ":00";
    const newEnd = endTime + ":00";

    const sameDay = schedules.filter((s) => s.day_of_week === day);

    for (let s of sameDay) {
      if (overlap(newStart, newEnd, s.start_time, s.end_time)) {
        setError("Este horario se solapa con uno ya creado.");
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

  const deleteSchedule = async (id) => {
    await supabase.from("schedules").delete().eq("id", id);
    loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* TÍTULO */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
            Horarios del negocio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configurá los días y horarios disponibles para tus clientes.
          </p>
        </div>

        {/* ALERTAS */}
        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-200">
            {success}
          </div>
        )}

        {/* CONFIGURACIÓN GENERAL */}
        <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-xl p-6 space-y-6">

          <h2 className="text-lg font-semibold text-emerald-300 tracking-tight">
            Configuración general
          </h2>

          {/* DÍAS HÁBILES */}
          <div>
            <label className="text-[12px] text-slate-300">
              Días que trabaja el negocio:
            </label>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
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
          </div>

          {/* INTERVALO */}
          <div>
            <label className="text-[12px] text-slate-300">
              Intervalo base:
            </label>
            <select
              className="mt-2 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
              value={slotInterval}
              onChange={(e) => setSlotInterval(Number(e.target.value))}
            >
              <option value={15}>Cada 15 min</option>
              <option value={20}>Cada 20 min</option>
              <option value={30}>Cada 30 min (recomendado)</option>
              <option value={45}>Cada 45 min</option>
              <option value={60}>Cada 60 min</option>
            </select>
          </div>

          <button
            onClick={saveBusinessSettings}
            className="w-full rounded-2xl bg-emerald-400 text-slate-950 font-semibold text-sm py-3 hover:bg-emerald-300 transition"
          >
            Guardar configuración
          </button>
        </div>

        {/* AGREGAR HORARIO */}
        <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-xl p-6 space-y-6">

          <h2 className="text-lg font-semibold text-emerald-300 tracking-tight">
            Agregar horario
          </h2>

          <form
            onSubmit={handleAdd}
            className="grid grid-cols-1 sm:grid-cols-5 gap-4"
          >
            <select
              className="rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            >
              {Object.keys(workingDays).map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>

            <input
              type="time"
              className="rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />

            <input
              type="time"
              className="rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />

            <input
              type="number"
              min={1}
              className="rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
              placeholder="Capacidad"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />

            <button className="rounded-2xl bg-emerald-400 text-slate-950 font-semibold text-sm py-2 hover:bg-emerald-300 transition">
              Agregar
            </button>
          </form>
        </div>

        {/* LISTA DE HORARIOS */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold tracking-tight text-slate-50">
            Horarios creados
          </h2>

          {schedules.length === 0 && (
            <p className="text-sm text-slate-400">
              No hay horarios aún.
            </p>
          )}

          {schedules.length > 0 && (
            <ul className="space-y-3">
              {schedules.map((s) => (
                <li
                  key={s.id}
                  className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow p-5 flex items-center justify-between"
                >
                  <span className="font-medium text-slate-50 text-sm">
                    {s.day_of_week}:{" "}
                    {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}{" "}
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
          )}
        </div>

      </div>
    </div>
  );
}
