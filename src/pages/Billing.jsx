import { supabase } from "../supabaseClient";
import toast from "react-hot-toast";

export default function Billing() {
  const startPayment = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Sesión no válida");
        return;
      }

      // ✅ La Edge Function exige (mínimo): amount + customer_email
      const payload = {
        user_id: session.user.id,
        amount: 690,
        description: "Suscripción Ritto (Plan mensual)",
        customer_email: session.user.email,
        customer_name: session.user.email,
        slug: "payment-success",
      };

      if (!payload.customer_email) {
        toast.error("Tu usuario no tiene email. Reingresá y probá de nuevo.");
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "create-mercadopago-checkout",
        {
          body: payload,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
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
