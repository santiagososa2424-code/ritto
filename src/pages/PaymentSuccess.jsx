import { useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function PaymentSuccess() {
  useEffect(() => {
    const run = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        // MP puede mandar status o collection_status
        const status = (params.get("status") || params.get("collection_status") || "").toLowerCase();

        // Aceptamos approved/success (y dejamos pasar vacío si hay paymentId, por si MP no manda status)
        const paymentId = params.get("payment_id") || params.get("collection_id");

        const isOkStatus = status === "approved" || status === "success";

        if (!paymentId && !isOkStatus) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        // Buscar el negocio más reciente del usuario (para saber qué activar)
        const { data: biz, error: bizErr } = await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bizErr) {
          console.error("PaymentSuccess businesses fetch error:", bizErr);
          return;
        }

        const businessId = biz?.id;
        if (!businessId) {
          console.error("PaymentSuccess: no business found for user");
          return;
        }

        // Verificar y activar en backend
        const { error } = await supabase.functions.invoke("create-mercadopago-checkout", {
          body: {
            action: "verify_and_activate",
            payment_id: paymentId,
            user_id: session.user.id,
            business_id: businessId,
            expected_amount: 690,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error("verify_and_activate error:", error, error?.context);
        }
      } catch (e) {
        console.error("PaymentSuccess run error:", e);
      }
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
