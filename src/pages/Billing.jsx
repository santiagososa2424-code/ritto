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

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await res.json();

      if (!data?.init_point) {
        toast.error("No se pudo iniciar el pago");
        return;
      }

      window.location.href = data.init_point;
    } catch (e) {
      toast.error("Error iniciando el pago");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-slate-900 p-6 rounded-2xl">
        <h1 className="text-lg font-semibold mb-2">
          Activar plan mensual
        </h1>
        <p className="text-sm mb-4">$690 / mes</p>
        <button
          onClick={startPayment}
          className="px-4 py-2 bg-emerald-400 text-black rounded-xl"
        >
          Pagar con Mercado Pago
        </button>
      </div>
    </div>
  );
}
