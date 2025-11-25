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
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Horarios del negocio</h1>

      {error && <p className="text-red-500">{error}</p>}

      <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-6">
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

        <button className="bg-black text-white p-2 rounded font-semibold">
          Agregar horario
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-2">Horarios creados</h2>

      {schedules.length === 0 && <p>No hay horarios aún.</p>}

      <ul className="divide-y">
        {schedules.map((s) => (
          <li key={s.id} className="py-2 flex justify-between">
            <span>
              {s.day_of_week}: {s.start_time} - {s.end_time}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
