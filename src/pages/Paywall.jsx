import { useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../supabaseClient";

export default function Paywall() {
  const [loading, setLoading] = useState(false);

  const goPay = async () => {
    try {
      setLoading(true);

      const {
        data: { session },
        error: sessErr,
      } = await supabase.auth.getSession();

      if (sessErr) throw sessErr;
      if (!session) {
        toast.error("Tenés que iniciar sesión.");
        return;
      }

      const user = session.user;

      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (bizErr) throw bizErr;
      if (!biz?.id) {
        toast.error("No se encontró tu negocio.");
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "create-mercadopago-checkout",
        { body: { business_id: biz.id } }
      );

      if (error) throw error;

      const initPoint = data?.init_point;
      if (!initPoint) {
        toast.error("No se pudo iniciar el pago.");
        return;
      }

      window.location.href = initPoint;
    } catch (e) {
      console.error("goPay error:", e);
      toast.error(e?.message || "Error iniciando el pago.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-900 px-4 py-10 text-slate-50">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-slate-900/90 border border-emerald-400/40 rounded-3xl p-6 text-center shadow-[0_18px_60px_rgba(16,185,129,0.35)] backdrop-blur-xl">
          <p className="text-sm font-semibold mb-2">Tu plan gratuito finalizó</p>
          <p className="text-xs text-slate-300">
            Para seguir usando Ritto y ver tus reservas, activá tu plan por{" "}
            <span className="font-semibold">$690/mes</span>.
          </p>
          <p className="text-[10px] text-slate-400 mt-2">
            Sin permanencia · Cancelás cuando quieras.
          </p>

          <button
            type="button"
            onClick={goPay}
            disabled={loading}
            className="mt-5 text-xs px-4 py-2 rounded-2xl bg-emerald-400 text-slate-950 font-semibold hover:bg-emerald-300 transition disabled:opacity-60"
          >
            {loading ? "Redirigiendo..." : "Activar plan ahora"}
          </button>
        </div>
      </div>
    </div>
  );
}
