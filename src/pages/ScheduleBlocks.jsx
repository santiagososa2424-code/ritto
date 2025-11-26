import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ScheduleBlocks() {
  const [businessId, setBusinessId] = useState(null);
  const [blocks, setBlocks] = useState([]);

  const [singleDate, setSingleDate] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [reason, setReason] = useState("");

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

    // obtener negocio
    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (!biz) {
      navigate("/setup");
      return;
    }

    setBusinessId(biz.id);

    // obtener bloqueos
    const { data: blk } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("business_id", biz.id)
      .order("date", { ascending: true });

    setBlocks(blk || []);
  };

  const addSingleDay = async () => {
    setError("");
    setSuccess("");

    if (!singleDate) {
      setError("Elegí una fecha.");
      return;
    }

    const { error: insertError } = await supabase
      .from("schedule_blocks")
      .insert({
        business_id: businessId,
        date: singleDate,
        reason,
      });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess("Día bloqueado.");
    setSingleDate("");
    setReason("");
    loadData();
  };

  const addRange = async () => {
    setError("");
    setSuccess("");

    if (!rangeStart || !rangeEnd) {
      setError("Elegí las fechas del rango.");
      return;
    }

    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);

    if (start > end) {
      setError("El rango es inválido.");
      return;
    }

    const days = [];
    let current = new Date(start);

    while (current <= end) {
      days.push(new Date(current).toISOString().slice(0, 10));
      current.setDate(current.getDate() + 1);
    }

    const inserts = days.map((d) => ({
      business_id: businessId,
      date: d,
      reason,
    }));

    const { error: insertError } = await supabase
      .from("schedule_blocks")
      .insert(inserts);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess("Rango bloqueado correctamente.");
    setRangeStart("");
    setRangeEnd("");
    setReason("");
    loadData();
  };

  const deleteBlock = async (id) => {
    await supabase.from("schedule_blocks").delete().eq("id", id);
    loadData();
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Bloquear días / Licencias</h1>

      {error && <p className="text-red-600 mb-3">{error}</p>}
      {success && <p className="text-green-600 mb-3">{success}</p>}

      {/* BLOQUEAR UN DÍA */}
      <div className="border rounded p-4 mb-6 bg-white shadow">
        <h2 className="text-lg font-semibold mb-3">Bloquear un día</h2>

        <input
          type="date"
          className="border rounded w-full p-2 mb-3"
          value={singleDate}
          onChange={(e) => setSingleDate(e.target.value)}
        />

        <input
          type="text"
          placeholder="Motivo (opcional)"
          className="border rounded w-full p-2 mb-3"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <button
          onClick={addSingleDay}
          className="bg-black text-white px-4 py-2 rounded w-full"
        >
          Bloquear día
        </button>
      </div>

      {/* BLOQUEAR RANGO */}
      <div className="border rounded p-4 mb-6 bg-white shadow">
        <h2 className="text-lg font-semibold mb-3">Bloquear un rango</h2>

        <label className="block text-sm mb-1">Desde</label>
        <input
          type="date"
          className="border rounded w-full p-2 mb-3"
          value={rangeStart}
          onChange={(e) => setRangeStart(e.target.value)}
        />

        <label className="block text-sm mb-1">Hasta</label>
        <input
          type="date"
          className="border rounded w-full p-2 mb-3"
          value={rangeEnd}
          onChange={(e) => setRangeEnd(e.target.value)}
        />

        <input
          type="text"
          placeholder="Motivo (opcional)"
          className="border rounded w-full p-2 mb-3"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <button
          onClick={addRange}
          className="bg-black text-white px-4 py-2 rounded w-full"
        >
          Bloquear rango
        </button>
      </div>

      {/* LISTA DE BLOQUEOS */}
      <h2 className="text-lg font-semibold mb-2">Días bloqueados</h2>
      <ul className="space-y-2">
        {blocks.map((b) => (
          <li
            key={b.id}
            className="border bg-white rounded p-3 flex justify-between"
          >
            <span>
              {b.date}{" "}
              {b.reason && (
                <span className="text-gray-500 text-sm">— {b.reason}</span>
              )}
            </span>
            <button
              onClick={() => deleteBlock(b.id)}
              className="text-red-600 text-sm"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
