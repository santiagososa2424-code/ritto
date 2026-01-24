import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ScheduleBlocks() {
  const [businessId, setBusinessId] = useState(null);
  const [blocks, setBlocks] = useState([]);

  const [singleDate, setSingleDate] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  // ✅ NUEVO: franja horaria
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");

  // ✅ NUEVO: tipo de bloqueo
  // "day" | "range" | "daily" | "weekly"
  const [blockType, setBlockType] = useState("day");
  const [weekDay, setWeekDay] = useState("lunes");

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

    // ✅ Ordena por date pero deja recurrentes (date=null) al final
    const { data: blk } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("business_id", biz.id)
      .order("date", { ascending: true, nullsFirst: false });

    setBlocks(blk || []);
  };

  const isValidHHMM = (t) => /^\d{2}:\d{2}$/.test(String(t || "").slice(0, 5));

  const validateTimeRange = () => {
    if (!isValidHHMM(startTime) || !isValidHHMM(endTime)) {
      setError("Elegí un horario válido (HH:MM).");
      return false;
    }
    if (startTime >= endTime) {
      setError("La franja horaria es inválida (inicio debe ser menor que fin).");
      return false;
    }
    return true;
  };

  // ----------------------------------------------------
  // ➕ Crear bloqueo (según tipo)
  // ----------------------------------------------------
  const addBlock = async () => {
    setError("");
    setSuccess("");

    if (!businessId) return;

    // Bloqueo por día / rango exige fecha
    if (blockType === "day" && !singleDate) {
      setError("Elegí una fecha.");
      return;
    }
    if (blockType === "range" && (!rangeStart || !rangeEnd)) {
      setError("Elegí las fechas del rango.");
      return;
    }

    // Bloqueos con franja (si no querés franja, podés poner 00:00–23:59)
    if (!validateTimeRange()) return;

    if (blockType === "day") {
      const { error: insertError } = await supabase.from("schedule_blocks").insert({
        business_id: businessId,
        date: singleDate,
        start_time: startTime,
        end_time: endTime,
        reason,
        is_recurring: false,
        recurring_type: null,
        day_of_week: null,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setSuccess("Bloqueo agregado.");
      setSingleDate("");
      setReason("");
      loadData();
      return;
    }

    if (blockType === "range") {
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
        start_time: startTime,
        end_time: endTime,
        reason,
        is_recurring: false,
        recurring_type: null,
        day_of_week: null,
      }));

      const { error: insertError } = await supabase.from("schedule_blocks").insert(inserts);

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setSuccess("Rango bloqueado correctamente.");
      setRangeStart("");
      setRangeEnd("");
      setReason("");
      loadData();
      return;
    }

    if (blockType === "daily") {
      const { error: insertError } = await supabase.from("schedule_blocks").insert({
        business_id: businessId,
        date: null,
        start_time: startTime,
        end_time: endTime,
        reason,
        is_recurring: true,
        recurring_type: "daily",
        day_of_week: null,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setSuccess("Pausa diaria agregada.");
      setReason("");
      loadData();
      return;
    }

    if (blockType === "weekly") {
      const { error: insertError } = await supabase.from("schedule_blocks").insert({
        business_id: businessId,
        date: null,
        start_time: startTime,
        end_time: endTime,
        reason,
        is_recurring: true,
        recurring_type: "weekly",
        day_of_week: weekDay,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setSuccess("Pausa semanal agregada.");
      setReason("");
      loadData();
      return;
    }
  };

  // ----------------------------------------------------
  // ❌ Eliminar bloqueo
  // ----------------------------------------------------
  const deleteBlock = async (id) => {
    await supabase.from("schedule_blocks").delete().eq("id", id);
    loadData();
  };

  const describeBlock = (b) => {
    const hours = `${String(b.start_time || "").slice(0, 5)}–${String(b.end_time || "").slice(0, 5)}`;

    if (b.is_recurring && b.recurring_type === "daily") {
      return `Todos los días · ${hours}`;
    }
    if (b.is_recurring && b.recurring_type === "weekly") {
      return `${b.day_of_week || "día"} · ${hours}`;
    }
    if (b.date) {
      return `${b.date} · ${hours}`;
    }
    return hours;
  };

  // ✅ PATCH UI: select oscuro + dropdown oscuro (Windows/Chrome)
  const darkSelect =
    "w-full rounded-2xl px-3 py-2 text-[13px] border border-white/10 " +
    "bg-slate-950/60 text-slate-100 outline-none " +
    "focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/15 transition";

  // ----------------------------------------------------
  // 🖥️ UI
  // ----------------------------------------------------
  return (
    <div className="min-h-screen text-slate-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="max-w-xl mx-auto space-y-10">
        {/* Header */}
        <Header
          title="Bloqueos y pausas"
          subtitle="Bloqueá días completos, franjas horarias y pausas recurrentes."
        />

        {/* Alertas */}
        {error && <Alert type="error" text={error} />}
        {success && <Alert type="success" text={success} />}

        {/* CARD — Nuevo bloqueo */}
        <Card title="Agregar bloqueo">
          <Field label="Tipo">
            <select
              className={darkSelect}
              style={{ colorScheme: "dark" }}
              value={blockType}
              onChange={(e) => setBlockType(e.target.value)}
            >
              <option value="day">Fecha específica</option>
              <option value="range">Rango de fechas</option>
              <option value="daily">Todos los días (recurrente)</option>
              <option value="weekly">Día de semana (recurrente)</option>
            </select>
          </Field>

          {blockType === "day" && (
            <Field label="Fecha">
              <input
                type="date"
                className="input-ritto"
                style={{ colorScheme: "dark" }}
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
              />
            </Field>
          )}

          {blockType === "range" && (
            <>
              <Field label="Desde">
                <input
                  type="date"
                  className="input-ritto"
                  style={{ colorScheme: "dark" }}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                />
              </Field>

              <Field label="Hasta">
                <input
                  type="date"
                  className="input-ritto"
                  style={{ colorScheme: "dark" }}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                />
              </Field>
            </>
          )}

          {blockType === "weekly" && (
            <Field label="Día de semana">
              <select
                className={darkSelect}
                style={{ colorScheme: "dark" }}
                value={weekDay}
                onChange={(e) => setWeekDay(e.target.value)}
              >
                <option value="lunes">Lunes</option>
                <option value="martes">Martes</option>
                <option value="miercoles">Miércoles</option>
                <option value="jueves">Jueves</option>
                <option value="viernes">Viernes</option>
                <option value="sabado">Sábado</option>
                <option value="domingo">Domingo</option>
              </select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Desde (hora)">
              <input
                type="time"
                className="input-ritto"
                style={{ colorScheme: "dark" }}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Field>

            <Field label="Hasta (hora)">
              <input
                type="time"
                className="input-ritto"
                style={{ colorScheme: "dark" }}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Field>
          </div>

          <Field>
            <input
              type="text"
              placeholder="Motivo (opcional)"
              className="input-ritto"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>

          <button onClick={addBlock} className="button-ritto w-full">
            Guardar bloqueo
          </button>
        </Card>

        {/* CARD — Lista de bloqueos */}
        <Card title="Bloqueos activos">
          {blocks.length === 0 ? (
            <p className="text-sm text-slate-400">No hay bloqueos.</p>
          ) : (
            <ul className="space-y-3 mt-3">
              {blocks.map((b) => (
                <li
                  key={b.id}
                  className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow flex justify-between items-center px-5 py-4"
                >
                  <div>
                    <p className="text-sm text-slate-50">{describeBlock(b)}</p>
                    {b.reason && <p className="text-[12px] text-slate-400">{b.reason}</p>}
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
      <h2 className="text-lg font-semibold text-emerald-300 tracking-tight">{title}</h2>
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
