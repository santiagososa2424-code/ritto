import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const monthStartDate = (d) => {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
};

const monthISO = (d) => monthStartDate(d).toISOString().slice(0, 10);

const monthLabel = (isoDate) => {
  // isoDate: "YYYY-MM-01"
  const d = new Date(isoDate);
  return d.toLocaleDateString("es-UY", { month: "long", year: "numeric" });
};

const parseNum = (v) => {
  const s = String(v ?? "").trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

export default function Expenses() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  const [business, setBusiness] = useState(null);

  // columnas (dinámicas) — se derivan de items, pero también se puede agregar manualmente
  const [columns, setColumns] = useState(["Sueldos", "Alquiler", "Insumos"]);

  // filas: [{ id, month, items }]
  const [rows, setRows] = useState([]);

  const totalsByRow = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const items = r.items || {};
      const total = Object.values(items).reduce((a, v) => a + Number(v || 0), 0);
      map.set(r.month, total);
    });
    return map;
  }, [rows]);

  // columns reales: unión de columnas base + keys encontradas en rows
  const effectiveColumns = useMemo(() => {
    const set = new Set(columns);
    rows.forEach((r) => {
      Object.keys(r.items || {}).forEach((k) => set.add(k));
    });
    // orden: primero las que ya tenías, luego el resto al final
    const base = columns.filter((c) => set.has(c));
    const extra = [...set].filter((c) => !base.includes(c));
    return [...base, ...extra];
  }, [columns, rows]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      const { data: s } = await supabase.auth.getSession();
      if (!s?.session) {
        navigate("/login");
        return;
      }

      const userId = s.session.user.id;

      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();

      if (bizErr || !biz) {
        console.error(bizErr);
        toast.error("No se pudo cargar tu negocio.");
        setLoading(false);
        return;
      }

      setBusiness(biz);

      // Traer últimos 12 meses (si no existen, los “upsert” los vamos creando al editar)
      const start = monthStartDate(new Date());
      start.setMonth(start.getMonth() - 11);

      const end = monthStartDate(new Date());
      end.setMonth(end.getMonth() + 1);

      const startISO = start.toISOString().slice(0, 10);
      const endISO = end.toISOString().slice(0, 10);

      const { data: dataRows, error: rowsErr } = await supabase
        .from("monthly_expenses")
        .select("id, month, items")
        .eq("business_id", biz.id)
        .gte("month", startISO)
        .lt("month", endISO)
        .order("month", { ascending: false });

      if (rowsErr) {
        console.error(rowsErr);
        toast.error("No se pudieron cargar los gastos mensuales.");
        setLoading(false);
        return;
      }

      // Queremos mostrar 12 meses aunque falten filas: generamos el esqueleto
      const wanted = [];
      for (let i = 0; i < 12; i++) {
        const d = monthStartDate(new Date());
        d.setMonth(d.getMonth() - i);
        wanted.push(monthISO(d));
      }

      const byMonth = new Map((dataRows || []).map((r) => [r.month, r]));
      const merged = wanted.map((m) => {
        const found = byMonth.get(m);
        return found
          ? { id: found.id, month: found.month, items: found.items || {} }
          : { id: null, month: m, items: {} };
      });

      setRows(merged);
      setLoading(false);
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addColumn = () => {
    const name = prompt("Nombre de la columna (ej: Marketing)");
    const col = String(name || "").trim();
    if (!col) return;
    if (col.toLowerCase() === "total") {
      toast.error("“Total” es automático.");
      return;
    }
    setColumns((prev) => (prev.includes(col) ? prev : [...prev, col]));
  };

  const saveRow = async (month, nextItems) => {
    if (!business?.id) return;
    setSavingKey(month);

    const { data: s } = await supabase.auth.getSession();
    const userId = s?.session?.user?.id;

    try {
      const payload = {
        business_id: business.id,
        created_by: userId,
        month, // "YYYY-MM-01"
        items: nextItems,
      };

      const { data, error } = await supabase
        .from("monthly_expenses")
        .upsert(payload, { onConflict: "business_id,month" })
        .select("id, month, items")
        .maybeSingle();

      if (error) throw error;

      setRows((prev) =>
        prev.map((r) =>
          r.month === month ? { id: data?.id || r.id, month, items: data?.items || nextItems } : r
        )
      );
    } catch (e) {
      console.error("saveRow error:", e);
      toast.error("No se pudo guardar.");
    } finally {
      setSavingKey(null);
    }
  };

  const setCell = async (month, col, rawValue) => {
    // actualiza local
    setRows((prev) =>
      prev.map((r) => {
        if (r.month !== month) return r;
        const next = { ...(r.items || {}) };
        const n = parseNum(rawValue);
        // si queda 0 y el input está vacío, limpiamos
        if (String(rawValue).trim() === "") {
          delete next[col];
        } else {
          next[col] = n;
        }
        return { ...r, items: next };
      })
    );

    // guardado “instantáneo” (simple)
    const r = rows.find((x) => x.month === month);
    const current = r?.items || {};
    const nextItems = { ...current };

    if (String(rawValue).trim() === "") delete nextItems[col];
    else nextItems[col] = parseNum(rawValue);

    await saveRow(month, nextItems);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-900 text-white p-6">
        <div className="text-slate-400">Cargando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-900 text-slate-50 p-5 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <header className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-[0.18em]">
              Gastos mensuales
            </p>
            <h1 className="text-xl font-semibold">
              {business?.name || "Ritto"}
            </h1>
            <p className="text-[11px] text-slate-400 mt-1">
              1 fila por mes · columnas libres · total automático
            </p>
          </div>

          <button
            type="button"
            onClick={addColumn}
            className="text-[12px] px-3 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            + Agregar columna
          </button>
        </header>

        <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-[900px] w-full text-[12px]">
              <thead className="bg-slate-900/70 border-b border-white/10">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">
                    Mes
                  </th>
                  {effectiveColumns.map((c) => (
                    <th key={c} className="text-left px-4 py-3 text-slate-400 font-medium">
                      {c}
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 text-slate-400 font-medium">
                    Total
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10">
                {rows.map((r) => {
                  const total = totalsByRow.get(r.month) || 0;
                  const totalLabel = new Intl.NumberFormat("es-UY").format(total);

                  return (
                    <tr key={r.month} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-slate-200 capitalize whitespace-nowrap">
                        {monthLabel(r.month)}
                      </td>

                      {effectiveColumns.map((c) => {
                        const v = r.items?.[c];
                        return (
                          <td key={`${r.month}-${c}`} className="px-4 py-3">
                            <input
                              defaultValue={v ?? ""}
                              onBlur={(e) => setCell(r.month, c, e.target.value)}
                              placeholder="0"
                              className="w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-[12px] outline-none"
                            />
                          </td>
                        );
                      })}

                      <td className="px-4 py-3 font-semibold whitespace-nowrap">
                        $ {totalLabel}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {savingKey === r.month ? (
                          <span className="text-[11px] text-slate-400">Guardando…</span>
                        ) : (
                          <span className="text-[11px] text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 border-t border-white/10 text-[11px] text-slate-400">
            El “Total” se calcula como suma de todas las columnas numéricas del mes. Las columnas son libres por negocio.
          </div>
        </div>
      </div>
    </div>
  );
}
