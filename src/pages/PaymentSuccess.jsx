import { useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function PaymentSuccess() {
  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const status = params.get("status");
      if (status !== "success") return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Si preferís activar por business_id, traelo antes.
      await supabase.functions.invoke("create-mercadopago-checkout", {
        body: {
          action: "activate_subscription",
          user_id: session.user.id,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    };

    run();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-md w-full rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.65)] p-10 text-center animate-fadeIn space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center shadow-inner">
            <span className="text-emerald-300 text-5xl font-bold">✓</span>
          </div>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight">¡Pago recibido!</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          La suscripción quedó activa por 30 días.
        </p>

        <a
          href="/"
          className="block w-full rounded-2xl bg-emerald-400 text-slate-950 font-semibold text-sm py-3 hover:bg-emerald-300 transition shadow-lg hover:scale-[1.02]"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
