import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setAllowed(false);
        return;
      }

      // Buscar suscripción del usuario
      const { data: sub, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Si hay error (pero no es "no rows"), dejamos pasar
      if (error && error.code !== "PGRST116") {
        console.error(error);
        setAllowed(true);
        return;
      }

      if (!sub) {
        // Recién registrado → tiene trial
        setAllowed(true);
        return;
      }

      const now = new Date();
      const expires = new Date(sub.expires_at);

      if (expires > now || sub.active === true) {
        // Trial vigente o suscripción activa
        setAllowed(true);
      } else {
        // Trial vencido / suscripción inactiva
        setAllowed(false);
      }
    };

    if (!loading) {
      checkSubscription();
    }
  }, [user, loading]);

  // ⏳ LOADER DISEÑO APPLE
  if (loading || allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="px-4 py-2 rounded-3xl bg-slate-900/80 border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl text-xs text-slate-200 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Verificando acceso...
        </div>
      </div>
    );
  }

  // ❌ NO AUTORIZADO
  if (!user || !allowed) {
    return <Navigate to="/login" replace />;
  }

  // ✔️ AUTORIZADO
  return children;
}
