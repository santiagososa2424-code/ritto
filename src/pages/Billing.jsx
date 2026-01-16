import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

export default function Billing() {
  const startPayment = async () => {
    try {
      const {
        data: { session },
        error: sessErr,
      } = await supabase.auth.getSession();

      if (sessErr) {
        console.error("getSession error:", sessErr);
        toast.error("Sesión no válida");
        return;
      }

      if (!session) {
        toast.error("Sesión no válida");
        return;
      }

      // ✅ Buscar business_id del usuario (para que la activación pegue SIEMPRE)
      // (alineado con la Edge Function: tabla businesses + owner_id + latest)
      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (bizErr) {
        console.error("bizErr:", bizErr);
        toast.error("No se pudo obtener el negocio");
        return;
      }

      if (!biz?.id) {
        console.error("No se encontró negocio para este usuario");
        toast.error("No se encontró tu negocio");
        return;
      }

      // ✅ NUEVO: usar action de suscripción (no depende de customer_email)
      // No rompe nada: PaymentSuccess sigue verificando/activando como antes.
      const payload = {
        action: "create_subscription_checkout",
        user_id: session.user.id,
        business_id: biz.id,
        amount: 690,
        slug: "payment-success",
      };

      const { data, error } = await supabase.functions.invoke(
        "create-mercadopago-checkout",
        {
          body: payload,
          // Nota: no pasamos Authorization manual; supabase-js usa la sesión actual.
        }
      );

      if (error) {
        console.error("invoke error:", error);
        console.error("invoke error context:", error?.context);
        toast.error("No se pudo iniciar el pago");
        return;
      }

      if (!data?.init_point) {
        console.error("invoke missing init_point, data:", data);
        toast.error("No se pudo iniciar el pago");
        return;
      }

      window.location.href = data.init_point;
    } catch (e) {
      console.error("startPayment error:", e);
      toast.error("Error iniciando el pago");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-6 text-slate-50">
        <p className="text-[11px] text-emerald-400 uppercase tracking-widest mb-1">
          Plan mensual
        </p>

        <h1 className="text-xl font-semibold mb-2">Activar plan de Ritto</h1>

        <p className="text-sm text-slate-300 mb-5">
          Accedé a la agenda completa, reservas online y gestión sin límites.
        </p>

        <div className="flex items-end gap-1 mb-6">
          <span className="text-4xl font-bold text-white">$690</span>
          <span className="text-sm text-slate-400 mb-1">/ mes</span>
        </div>

        <button
          onClick={startPayment}
          className="w-full px-4 py-3 rounded-2xl bg-emerald-400 text-slate-950 font-semibold hover:bg-emerald-300 transition shadow-[0_8px_30px_rgba(16,185,129,0.4)]"
        >
          Pagar con Mercado Pago
        </button>

        <p className="text-[11px] text-slate-400 mt-4 text-center">
          Sin permanencia · Cancelás cuando quieras
        </p>
      </div>
    </div>
  );
}
