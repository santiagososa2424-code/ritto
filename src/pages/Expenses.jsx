import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export default function Expenses() {
  const [session, setSession] = useState(null);
  const [business, setBusiness] = useState(null);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState([]);

  // form
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("Alquiler");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const startEnd = useMemo(() => {
    const start = new Date(month);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    return {
      startISO: start.toISOString().slice(0, 10),
      endISO: end.toISOString().slice(0, 10),
      label: start.toLocaleDateString("es-UY", { month: "long", year: "numeric" }),
    };
  }, [month]);

  const total = useMemo(() => {
    return items.reduce((acc, it) => acc + Number(it.amount || 0), 0);
  }, [items]);

  const totalLabel = useMemo(() => {
    return new Intl.NumberFormat("es-UY").format(total || 0);
  }, [total]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      const { data: s } = await supabase.auth.getSession();
      setSession(s?.session || null);

      if (!s?.session) {
        setLoading(false);
        return;
      }

      // 1) buscar business del owner
      const { data: b, error: be } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", s.session.user.id)
        .maybeSingle();

      if (be) console.error(be);
      setBusiness(b || null);

      setLoading(false);
    };

    run();
  }, []);

  const loadMonth = async () => {
    if (!business?.id) return;
    const { data, error } = await supabase
      .from("expenses")
      .select("id, expense_date, category, amount, note, created_at")
      .eq("business_id", business.id)
      .gte("expense_date", startEnd.startISO)
      .lt("expense_date", startEnd.endISO)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }
    setItems(data || []);
  };

  useEffect(() => {
    if (!business?.id) return;
    loadMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id, startEnd.startISO, startEnd.endISO]);

  const prevMonth = () => {
    const d = new Date(month);
    d.setMonth(d.getMonth() - 1);
    d.setDate(1);
    setMonth(d);
  };

  const nextMonth = () => {
    const d = new Date(month);
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    setMonth(d);
  };

  const addExpense = async (e) => {
    e.preventDefault();
    if (!business?.id || !session?.user?.id) return;

    const num = Number(String(amount).replace(",", "."));
    if (!Number.isFinite(num) || num <= 0) return;

    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      business_id: business.id,
      created_by: session.user.id,
      expense_date: expenseDate,
      category: category.trim(),
      amount: num,
      note: note.trim() || null,
    });
    setSaving(false);

    if (error) {
      console.error(error);
      return;
    }

    // reset form
    setAmount("");
    setNote("");
    setCategory("Alquiler");

    await loadMonth();
  };

  const deleteExpense = async (id) => {
    if (!id) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      console.error(error);
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="text-slate-400">Cargando…</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="text-slate-300">Necesitás iniciar sesión.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Gastos</h1>
            <div className="text-slate-400 text-sm">Control mensual de gastos del negocio</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="text-[12px] px-3 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              ←
            </button>
            <div className="text-sm text-slate-200 capitalize">{startEnd.label}</div>
            <button
              type="button"
              onClick={nextMonth}
              className="text-[12px] px-3 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              →
            </button>
          </div>
        </div>

        {/* MÉTRICAS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
            <div className="text-slate-400 text-xs">Total del mes</div>
            <div className="text-2xl font-semibold mt-1">$ {totalLabel}</div>
            <div className="text-slate-400 text-xs mt-1">UYU</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
            <div className="text-slate-400 text-xs">Registros</div>
            <div className="text-2xl font-semibold mt-1">{items.length}</div>
            <div className="text-slate-400 text-xs mt-1">en {monthKey(month)}</div>
          </div>
        </section>

        {/* FORM + LIST */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* FORM */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
            <div className="text-sm font-semibold mb-3">Agregar gasto</div>

            <form onSubmit={addExpense} className="flex flex-col gap-3">
              <label className="text-xs text-slate-400">
                Fecha
                <input
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  type="date"
                  className="mt-1 w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
                />
              </label>

              <label className="text-xs text-slate-400">
                Categoría
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
                >
                  {[
                    "Alquiler",
                    "Sueldos",
                    "Servicios (UTE/agua/internet)",
                    "Insumos",
                    "Marketing",
                    "Impuestos",
                    "Mantenimiento",
                    "Otros",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs text-slate-400">
                Monto (UYU)
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ej: 1600"
                  className="mt-1 w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
                />
              </label>

              <label className="text-xs text-slate-400">
                Nota (opcional)
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: cambio de lámparas"
                  className="mt-1 w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none"
                />
              </label>

              <button
                disabled={saving}
                className="mt-2 text-[12px] px-3 py-2 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/15 transition disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar gasto"}
              </button>
            </form>
          </div>

          {/* LIST */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="text-sm font-semibold">Gastos del mes</div>
              <div className="text-xs text-slate-400">{items.length} items</div>
            </div>

            <div className="divide-y divide-white/10">
              {items.length === 0 ? (
                <div className="p-4 text-sm text-slate-400">No hay gastos cargados en este mes.</div>
              ) : (
                items.map((it) => (
                  <div key={it.id} className="p-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm text-slate-200">
                        <span className="font-semibold">{it.category}</span>
                        <span className="text-slate-500"> · </span>
                        <span className="text-slate-400">{it.expense_date}</span>
                      </div>
                      {it.note ? <div className="text-xs text-slate-400 mt-1">{it.note}</div> : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold whitespace-nowrap">
                        $ {new Intl.NumberFormat("es-UY").format(Number(it.amount || 0))}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteExpense(it.id)}
                        className="text-[12px] px-3 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
