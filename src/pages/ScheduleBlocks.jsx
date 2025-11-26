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
    <div className="min-h-screen text-slate-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="max-w-xl mx-auto space-y-8">

        {/* Título */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Bloquear días y licencias
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Usá esta sección para bloquear días en los que no vas a trabajar.
          </p>
        </div>

        {/* Alertas */}
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

        {/* Bloquear día */}
        <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-emerald-300 tracking-tight">
            Bloquear un día
          </h2>

          <input
            type="date"
            className="w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
            value={singleDate}
            onChange={(e) => setSingleDate(e.target.value)}
          />

          <input
            type="text"
            placeholder="Motivo (opcional)"
            className="w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <button
            onClick={addSingleDay}
            className="w-full rounded-2xl bg-emerald-400 text-slate-950 font-semibold text-sm py-2.5 hover:bg-emerald-300 transition"
          >
            Bloquear día
          </button>
        </div>

        {/* Bloquear rango */}
        <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-emerald-300 tracking-tight">
            Bloquear un rango
          </h2>

          <div>
            <label className="text-[12px] text-slate-300">Desde</label>
            <input
              type="date"
              className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[12px] text-slate-300">Hasta</label>
            <input
              type="date"
              className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
            />
          </div>

          <input
            type="text"
            placeholder="Motivo (opcional)"
            className="w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <button
            onClick={addRange}
            className="w-full rounded-2xl bg-emerald-400 text-slate-950 font-semibold text-sm py-2.5 hover:bg-emerald-300 transition"
          >
            Bloquear rango
          </button>
        </div>

        {/* Lista de bloqueos */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-slate-50">
            Días bloqueados
          </h2>

          {blocks.length === 0 && (
            <p className="text-sm text-slate-400">
              No hay días bloqueados.
            </p>
          )}

          {blocks.map((b) => (
            <div
              key={b.id}
              className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow flex justify-between items-center px-5 py-4"
            >
              <div>
                <p className="text-sm text-slate-50">{b.date}</p>
                {b.reason && (
                  <p className="text-[12px] text-slate-400">{b.reason}</p>
                )}
              </div>

              <button
                onClick={() => deleteBlock(b.id)}
                className="text-sm px-4 py-1.5 rounded-2xl border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 transition"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
