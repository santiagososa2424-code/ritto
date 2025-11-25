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

      // Si hay error raro, por ahora dejamos pasar
      if (error && error.code !== "PGRST116") {
        console.error(error);
        setAllowed(true);
        return;
      }

      if (!sub) {
        // No tiene suscripción creada → recién registrado → permitir trial
        setAllowed(true);
        return;
      }

      const now = new Date();
      const expires = new Date(sub.expires_at);

      if (expires > now || sub.active === true) {
        // Trial todavía vigente o suscripción activa
        setAllowed(true);
      } else {
        // Trial vencido y suscripción inactiva
        setAllowed(false);
      }
    };

    if (!loading) {
      checkSubscription();
    }
  }, [user, loading]);

  if (loading || allowed === null) {
    return <div className="p-6">Cargando...</div>;
  }

  if (!user || !allowed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
