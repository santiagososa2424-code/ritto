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
  const [loading, setLoading] = useState(true);

  // mes seleccionado (YYYY-MM)
  const [month, setMonth] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  });

  // planilla: {Categoria: monto}
  const [rows, setRows] = useState(() => {
    const obj = {};
    CATEGORIES.forEach((c) => (obj[c] = 0));
    return obj;
  });

  const [saving, setSaving] = useState(false);

  // comparativo
  const [revenue30, setRevenue30] = useState(0);

  const navigate = useNavigate();

  const monthStartStr = useMemo(() => `${month}-01`, [month]);

  const totalExpenses = useMemo(() => {
    return CATEGORIES.reduce((acc, c) => acc + Number(rows[c] || 0), 0);
  }, [rows]);

  const net = useMemo(() => {
    return Number(revenue30 || 0) - Number(totalExpenses || 0);
  }, [revenue30, totalExpenses]);

  const money = (n) => new Intl.NumberFormat("es-UY").format(Number(n || 0));

  useEffect(() => {
    loadBusiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (business) {
      loadMonthExpenses();
      loadRevenueLast30Days();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business?.id, monthStartStr]);

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

      const { data: biz, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (error || !biz) {
        navigate("/setup");
        return;
      }

      setBusiness(biz);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar el negocio.");
    } finally {
      setLoading(false);
    }
  };

  const loadMonthExpenses = async () => {
    if (!business) return;

    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("category, amount")
        .eq("business_id", business.id)
        .eq("month", monthStartStr);

      if (error) throw error;

      const next = {};
      CATEGORIES.forEach((c) => (next[c] = 0));
      (data || []).forEach((r) => {
        if (r?.category && CATEGORIES.includes(r.category)) {
          next[r.category] = Number(r.amount || 0);
        }
      });

      setRows(next);
    } catch (e) {
      console.error("loadMonthExpenses error:", e);
      toast.error("No se pudieron cargar los gastos.");
    }
  };

  // Misma lógica de ingresos del Dashboard: últimos 30 días
  const loadRevenueLast30Days = async () => {
    if (!business) return;

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const date30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

      const depositOn = business.deposit_enabled === true;

      const normStatus = (s) => String(s || "").toLowerCase().trim();
      const isCancelledStatus = (s) => {
        const st = normStatus(s);
        return st === "cancelled" || st === "canceled" || st === "rejected";
      };

      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, price")
        .eq("business_id", business.id);

      if (servicesError) console.error("servicesError:", servicesError);

      const servicesMap = new Map();
      (servicesData || []).forEach((s) => servicesMap.set(s.id, s));

      const { data: recentBookings, error: recentBookingsError } = await supabase
        .from("bookings")
        .select("service_id, service_name, status, date")
        .eq("business_id", business.id)
        .gte("date", date30)
        .lte("date", todayStr);

      if (recentBookingsError) console.error("recentBookingsError:", recentBookingsError);

      let totalRev = 0;

      (recentBookings || [])
        .filter((b) => {
          const st = normStatus(b?.status);

          if (!depositOn) return !isCancelledStatus(st);

          return st === "confirmed";
        })
        .forEach((b) => {
          const svc =
            servicesMap.get(b.service_id) ||
            (servicesData || []).find((s) => String(s.name) === String(b.service_name));
          totalRev += Number(svc?.price) || 0;
        });

      setRevenue30(totalRev);
    } catch (e) {
      console.error("loadRevenueLast30Days error:", e);
      setRevenue30(0);
    }
  };

  const onChangeAmount = (cat, value) => {
    const n = Number(value);
    setRows((prev) => ({
      ...prev,
      [cat]: Number.isFinite(n) && n >= 0 ? n : 0,
    }));
  };

  const saveAll = async () => {
    if (!business) return;

    try {
      setSaving(true);

      const payload = CATEGORIES.map((cat) => ({
        business_id: business.id,
        month: monthStartStr,
        category: cat,
        amount: Number(rows[cat] || 0),
        created_by: null,
      }));

      const { error } = await supabase
        .from("expenses")
        .upsert(payload, { onConflict: "business_id,month,category" });

      if (error) throw error;

      toast.success("Gastos guardados.");
    } catch (e) {
      console.error("saveAll error:", e);
      toast.error("No se pudieron guardar los gastos.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="px-4 py-2 rounded-3xl bg-slate-900/80 border border-white/10 shadow-lg backdrop-blur-xl text-xs flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Cargando gastos...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-10">
        <Header title="Gastos" subtitle="Cargá tus gastos mensuales por categoría y comparalos con tus ingresos." />

        <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold tracking-tight text-emerald-300">
            Comparativo
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MiniCard label="Ingresos" value={`$ ${money(revenue30)}`} sub="Últimos 30 días" />
            <MiniCard label="Gastos" value={`$ ${money(totalExpenses)}`} sub="Mes seleccionado" />
            <MiniCard label="Neto" value={`$ ${money(net)}`} sub="Ingresos - Gastos" />
          </div>
        </div>

        <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-xl p-6 space-y-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-semibold tracking-tight text-emerald-300">
              Planilla mensual
            </h2>

            <div className="flex items-center gap-2">
              <input
                type="month"
                className="input-ritto"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
              <button
                type="button"
                onClick={saveAll}
                disabled={saving}
                className="button-ritto disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden">
            <div className="grid grid-cols-3 text-[11px] border-b border-white/10 bg-slate-900/70">
              <div className="px-3 py-2 text-slate-400 border-r border-white/10">Categoría</div>
              <div className="px-3 py-2 text-slate-400 border-r border-white/10">Monto</div>
              <div className="px-3 py-2 text-slate-400">Nota</div>
            </div>

            <div className="text-[12px]">
              {CATEGORIES.map((cat) => (
                <div
                  key={cat}
                  className="grid grid-cols-3 border-b border-white/10 hover:bg-white/5"
                >
                  <div className="px-3 py-2.5 border-r border-white/10 text-slate-200 font-medium">
                    {cat}
                  </div>

                  <div className="px-3 py-2.5 border-r border-white/10">
                    <input
                      type="number"
                      min={0}
                      className="input-ritto"
                      value={rows[cat]}
                      onChange={(e) => onChangeAmount(cat, e.target.value)}
                    />
                  </div>

                  <div className="px-3 py-2.5 text-slate-500">
                    —
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-3 bg-white/5">
                <div className="px-3 py-2.5 border-r border-white/10 text-slate-200 font-semibold">
                  Total
                </div>
                <div className="px-3 py-2.5 border-r border-white/10 text-slate-200 font-semibold">
                  $ {money(totalExpenses)}
                </div>
                <div className="px-3 py-2.5 text-slate-500">—</div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="text-[12px] px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            Volver al panel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── UI helpers ───────── */

function Header({ title, subtitle }) {
  return (
    <div className="text-center space-y-1">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function MiniCard({ label, value, sub }) {
  return (
    <div className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow p-5">
      <p className="text-[11px] text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-[11px] text-slate-500 mt-1">{sub}</p>
    </div>
  );
}
