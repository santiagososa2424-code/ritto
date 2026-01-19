import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const CATEGORIES = [
  "Alquiler",
  "Sueldos",
  "Insumos",
  "Publicidad",
  "Impuestos",
  "Servicios",
  "Otros",
];

export default function Expenses() {
  const [business, setBusiness] = useState(null);
  const [month, setMonth] = useState(() =>
    new Date().toISOString().slice(0, 7)
  );
  const [rows, setRows] = useState({});
  const navigate = useNavigate();

  const monthDate = `${month}-01`;

  useEffect(() => {
    load();
  }, [month]);

  const load = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (!biz) return navigate("/setup");
    setBusiness(biz);

    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("business_id", biz.id)
      .eq("month", monthDate);

    const map = {};
    CATEGORIES.forEach((c) => (map[c] = 0));
    (data || []).forEach((e) => (map[e.category] = Number(e.amount)));

    setRows(map);
  };

  const save = async (category, value) => {
    const { error } = await supabase.from("expenses").upsert({
      business_id: business.id,
      month: monthDate,
      category,
      amount: Number(value) || 0,
    });

    if (error) {
      toast.error("No se pudo guardar");
    } else {
      toast.success("Guardado");
    }
  };

  const total = useMemo(
    () => Object.values(rows).reduce((a, b) => a + Number(b || 0), 0),
    [rows]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold text-emerald-300">Gastos</h1>

        <input
          type="month"
          className="input-ritto w-40"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />

        <div className="rounded-3xl bg-slate-900/70 border border-white/10 p-6 space-y-4">
          {CATEGORIES.map((c) => (
            <div key={c} className="flex items-center justify-between gap-4">
              <span className="text-sm">{c}</span>
              <input
                type="number"
                className="input-ritto w-32 text-right"
                value={rows[c] || ""}
                onChange={(e) =>
                  setRows({ ...rows, [c]: e.target.value })
                }
                onBlur={(e) => save(c, e.target.value)}
              />
            </div>
          ))}

          <div className="pt-4 border-t border-white/10 flex justify-between font-semibold text-emerald-300">
            <span>Total</span>
            <span>$ {total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
