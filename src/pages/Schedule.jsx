import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Schedule() {
  const [businessId, setBusinessId] = useState(null);
  const [day, setDay] = useState("Lunes");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (!business) {
      navigate("/setup");
      return;
    }

    setBusinessId(business.id);

    const { data: scheduleData } = await supabase
      .from("schedules")
      .select("*")
      .eq("business_id", business.id);

    setSchedules(scheduleData || []);
  };

  const overlap = (aStart, aEnd, bStart, bEnd) => {
    return aStart < bEnd && bStart < aEnd;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");

    if (!startTime || !endTime) {
      setError("Completá todos los campos.");
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
      business_id: businessId,
      day_of_week: day,
      start_time: newStart,
      end_time: newEnd,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    await loadData();
    setStartTime("");
    setEndTime("");
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-700 mb-6">
        Horarios de atención
      </h1>

      {/* Error */}
      {error && (
        <p className="mb-4 text-red-600 font-medium bg-red-50 p-3 rounded">
          {error}
        </p>
      )}

      {/* Formulario */}
      <div className="bg-white border rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-blue-700 mb-4">
          Agregar horario
        </h2>

        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            className="border p-2 rounded"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          >
            <option>Lunes</option>
            <option>Martes</option>
            <option>Miércoles</option>
            <option>Jueves</option>
            <option>Viernes</option>
            <option>Sábado</option>
            <option>Domingo</option>
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

          <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded font-semibold">
            Agregar
          </button>
        </form>
      </div>

      {/* Lista */}
      <h2 className="text-2xl font-semibold text-blue-700 mb-3">
        Horarios creados
      </h2>

      {schedules.length === 0 && (
        <p className="text-gray-600">No hay horarios aún.</p>
      )}

      <ul className="divide-y bg-white border rounded-xl shadow-sm">
        {schedules.map((s) => (
          <li key={s.id} className="flex justify-between p-4 items-center">
            <span className="font-medium text-gray-700">
              {s.day_of_week}: {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
