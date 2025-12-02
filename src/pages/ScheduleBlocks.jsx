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

  // ----------------------------------------------------
  // 🔥 Cargar negocio + bloqueos
  // ----------------------------------------------------
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

  // ----------------------------------------------------
  // ➕ Bloquear 1 día
  // ----------------------------------------------------
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

  // ----------------------------------------------------
  // ➕ Bloquear rango
  // ----------------------------------------------------
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
      days.push(current.toISOString().slice(0, 10));
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

  // ----------------------------------------------------
  // ❌ Eliminar bloqueo
  // ----------------------------------------------------
  const deleteBlock = async (id) => {
    await supabase.from("schedule_blocks").delete().eq("id", id);
    loadData();
  };

  // ----------------------------------------------------
  // 🖥️ UI
  // ----------------------------------------------------
  return (
    <div className="min-h-screen text-slate-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="max-w-xl mx-auto space-y-10">

        {/* Header */}
        <Header
          title="Bloquear días y licencias"
          subtitle="Usá esta sección para bloquear días en los que no vas a trabajar."
        />

        {/* Alertas */}
        {error && <Alert type="error" text={error} />}
        {success && <Alert type="success" text={success} />}

        {/* CARD — Bloquear día */}
        <Card title="Bloquear un día">
          <Field>
            <input
              type="date"
              className="input-ritto"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
            />
          </Field>

          <Field>
            <input
              type="text"
              placeholder="Motivo (opcional)"
              className="input-ritto"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          <button onClick={addSingleDay} className="button-ritto w-full">
            Bloquear día
          </button>
        </Card>

        {/* CARD — Bloquear rango */}
        <Card title="Bloquear un rango">
          <Field label="Desde">
            <input
              type="date"
              className="input-ritto"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
            />
          </Field>

          <Field label="Hasta">
            <input
              type="date"
              className="input-ritto"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
            />
          </Field>

          <Field>
            <input
              type="text"
              placeholder="Motivo (opcional)"
              className="input-ritto"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          <button onClick={addRange} className="button-ritto w-full">
            Bloquear rango
          </button>
        </Card>

        {/* CARD — Lista de bloqueos */}
        <Card title="Días bloqueados">
          {blocks.length === 0 ? (
            <p className="text-sm text-slate-400">No hay días bloqueados.</p>
          ) : (
            <ul className="space-y-3 mt-3">
              {blocks.map((b) => (
                <li
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
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 🎨 Subcomponentes
// ----------------------------------------------------

function Header({ title, subtitle }) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
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
      {label && <label className="text-[12px] text-slate-300">{label}</label>}
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
