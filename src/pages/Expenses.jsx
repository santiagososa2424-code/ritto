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

const monthToMonthStart = (yyyyMm) => {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return "";
  return `${yyyyMm}-01`;
};

export default function Expenses() {
  const [business, setBusiness] = useState(null);
  const [businessId, setBusinessId] = useState(null);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [rows, setRows] = useState(() =>
    CATEGORIES.reduce((acc, c) => {
      acc[c] = 0;
      return acc;
    }, {})
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  const monthStart = useMemo(() => monthToMonthStart(month), [month]);

  const total = useMemo(() => {
    return CATEGORIES.reduce((sum, c) => sum + (Number(rows[c]) || 0), 0);
  }, [rows]);

  const totalLabel = useMemo(() => {
    return new Intl.NumberFormat("es-UY").format(total || 0);
  }, [total]);

  useEffect(() => {
    loadBusiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (businessId && monthStart) loadMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, monthStart]);

  const loadBusiness = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

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
      setBusinessId(biz.id);
    } catch (e) {
      console.error("loadBusiness expenses error:", e);
      toast.error("No se pudo cargar tu negocio.");
    } finally {
      setLoading(false);
    }
  };

  const loadMonth = async () => {
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("category, amount")
        .eq("business_id", businessId)
        .eq("month", monthStart);

      if (error) throw error;

      const base = CATEGORIES.reduce((acc, c) => {
        acc[c] = 0;
        return acc;
      }, {});

      (data || []).forEach((r) => {
        if (base.hasOwnProperty(r.category)) {
          base[r.category] = Number(r.amount) || 0;
        }
      });

      setRows(base);
    } catch (e) {
      console.error("loadMonth expenses error:", e);
      // si aún no existe tabla/policy, que no rompa la UI
      toast.error("No se pudieron cargar los gastos.");
    }
  };

  const setValue = (cat, val) => {
    const num = Number(String(val).replace(",", "."));
    setRows((prev) => ({ ...prev, [cat]: Number.isFinite(num) ? num : 0 }));
  };

  const saveMonth = async () => {
    if (!businessId || !monthStart) return;

    try {
      setSaving(true);

      const payload = CATEGORIES.map((cat) => ({
        business_id: businessId,
        month: monthStart,
        category: cat,
        amount: Number(rows[cat]) || 0,
      }));

      const { error } = await supabase
        .from("expenses")
        .upsert(payload, { onConflict: "business_id,month,category" });

      if (error) throw error;

      toast.success("Gastos guardados.");
    } catch (e) {
      console.error("saveMonth expenses error:", e);
      toast.error("No se pudieron guardar los gastos.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-900 text-slate-50">
        <div className="px-4 py-2 rounded-3xl bg-slate-900/80 border border-white/10 shadow-lg backdrop-blur-xl text-xs flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Cargando gastos...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-900 text-slate-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <Header
          title="Gastos"
          subtitle="Cargá tus gastos mensuales por categoría. Se calcula el total automáticamente."
        />

        <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] text-slate-400">Negocio</p>
              <p className="text-sm font-semibold">{business?.name || "Ritto"}</p>
            </div>

            <div className="flex items-end gap-3">
              <div>
                <label className="text-[11px] text-slate-400">Mes</label>
                <input
                  type="month"
                  className="input-ritto mt-1"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={saveMonth}
                disabled={saving}
                className="button-ritto disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden">
            <div className="grid grid-cols-2 text-[11px] border-b border-white/10 bg-slate-900/70">
              <div className="px-3 py-2 text-slate-400 border-r border-white/10">
                Categoría
              </div>
              <div className="px-3 py-2 text-slate-400 text-right">Monto</div>
            </div>

            <div className="divide-y divide-white/10">
              {CATEGORIES.map((cat) => (
                <div key={cat} className="grid grid-cols-2 items-center">
                  <div className="px-3 py-3 text-[12px] text-slate-200 border-r border-white/10">
                    {cat}
                  </div>
                  <div className="px-3 py-3 flex justify-end">
                    <input
                      type="number"
                      min={0}
                      className="input-ritto text-right w-[160px]"
                      value={rows[cat]}
                      onChange={(e) => setValue(cat, e.target.value)}
                    />
                  </div>
                </div>
              ))}

              {/* TOTAL */}
              <div className="grid grid-cols-2 items-center bg-white/5">
                <div className="px-3 py-3 text-[12px] font-semibold text-slate-50 border-r border-white/10">
                  Total
                </div>
                <div className="px-3 py-3 text-right text-[12px] font-semibold text-emerald-300">
                  $ {totalLabel}
                </div>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500">
            Consejo: cargá números aproximados. Lo importante es ver tu margen real.
          </p>
        </div>
      </div>
    </div>
  );
}

/* UI */
function Header({ title, subtitle }) {
  return (
    <div className="text-center space-y-1">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}
