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

  const [slotInterval, setSlotInterval] = useState(30); // intervalo base
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

  // CARGAR DATOS DEL NEGOCIO + HORARIOS
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

    // Si ya existe config de intervalo y días
    if (biz.slot_interval_minutes) {
      setSlotInterval(biz.slot_interval_minutes);
    }

    if (biz.working_days) {
      setWorkingDays(biz.working_days);
    }

    // Horarios cargados
    const { data: scheduleData } = await supabase
      .from("schedules")
      .select("*")
      .eq("business_id", biz.id)
      .order("day_of_week");

    setSchedules(scheduleData || []);
  };

  // GUARDAR CONFIGURACIÓN GLOBAL DEL NEGOCIO
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

  // DETECTAR SOLAPAMIENTOS
  const overlap = (aStart, aEnd, bStart, bEnd) => {
    return aStart < bEnd && bStart < aEnd;
  };

  // AGREGAR HORARIO
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

    // Solapamiento
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

  // ELIMINAR
  const deleteSchedule = async (id) => {
    await supabase.from("schedules").delete().eq("id", id);
    loadData();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-700 mb-6">Horarios del negocio</h1>

      {/* CONFIGURACIÓN GLOBAL */}
      <div className="bg-white border rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-blue-700 mb-4">
          Configuración general
        </h2>

        {/* Días habilitados */}
        <h3 className="text-sm font-semibold mb-2 text-gray-700">
          Días que trabaja el negocio:
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {Object.keys(workingDays).map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm">
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

        {/* Intervalo base */}
        <h3 className="text-sm font-semibold mb-2 text-gray-700">
          Intervalo base de agenda:
        </h3>

        <select
          className="border p-2 rounded mb-4"
          value={slotInterval}
          onChange={(e) => setSlotInterval(Number(e.target.value))}
        >
          <option value={15}>Cada 15 min</option>
          <option value={20}>Cada 20 min</option>
          <option value={30}>Cada 30 min (recomendado)</option>
          <option value={45}>Cada 45 min</option>
          <option value={60}>Cada 60 min</option>
        </select>

        <button
          onClick={saveBusinessSettings}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded font-semibold"
        >
          Guardar configuración
        </button>
      </div>

      {/* ERRORES / ÉXITO */}
      {error && (
        <p className="mb-4 text-red-600 font-medium bg-red-50 p-3 rounded">{error}</p>
      )}
      {success && (
        <p className="mb-4 text-green-600 font-medium bg-green-50 p-3 rounded">
          {success}
        </p>
      )}

      {/* FORMULARIO DE HORARIOS */}
      <div className="bg-white border rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-blue-700 mb-4">
          Agregar horario
        </h2>

        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select
            className="border p-2 rounded"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          >
            {Object.keys(workingDays).map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>

          <input
            type="time"
            className="border p-2 rounded"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />

          <input
            type="time"
            className="border p-2 rounded"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />

          <input
            type="number"
            className="border p-2 rounded"
            placeholder="Capacidad"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />

          <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-semibold">
            Agregar
          </button>
        </form>
      </div>

      {/* LISTA */}
      <h2 className="text-2xl font-semibold text-blue-700 mb-3">Horarios creados</h2>

      {schedules.length === 0 && (
        <p className="text-gray-600">No hay horarios aún.</p>
      )}

      <ul className="divide-y bg-white border rounded-xl shadow-sm">
        {schedules.map((s) => (
          <li key={s.id} className="flex justify-between p-4 items-center">
            <span className="font-medium text-gray-700">
              {s.day_of_week}: {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
              {"  "}
              <span className="text-blue-700 text-sm">
                (capacidad: {s.capacity_per_slot || 1})
              </span>
            </span>

            <button
              className="text-red-600 text-sm hover:underline"
              onClick={() => deleteSchedule(s.id)}
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
