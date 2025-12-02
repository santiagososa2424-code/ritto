import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data?.user) {
        setUser(null);
        setAllowed(false);
        setLoadingUser(false);
        return;
      }

      setUser(data.user);
      setLoadingUser(false);
    };

    loadUser();
  }, []);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) return;

      // Buscar suscripción
      const { data: sub, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Si no hay suscripción → usuario recién creado → trial activo
      if (error?.code === "PGRST116" || !sub) {
        setAllowed(true);
        return;
      }

      const now = new Date();
      const expires = new Date(sub.expires_at);

      if (sub.active || expires > now) {
        setAllowed(true);
      } else {
        setAllowed(false);
      }
    };

    if (!loadingUser) {
      checkSubscription();
    }
  }, [user, loadingUser]);

  // ⏳ LOADER APPLE-RITTO
  if (loadingUser || allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-900">
        <div className="px-4 py-2 rounded-3xl bg-white/10 border border-white/20 shadow-xl backdrop-blur-xl text-xs text-slate-200 flex items-center gap-2 animate-fadeIn">
          <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
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
