import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ProtectedRoute({ children }) {
  const [allowed, setAllowed] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAccess = async (session) => {
      if (!session) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const user = session.user;

      // lifetime_free
      if (user.user_metadata?.lifetime_free) {
        setAllowed(true);
        setLoading(false);
        return;
      }

      const { data: business } = await supabase
        .from("businesses")
        .select("subscription_status, trial_ends_at")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!business) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      if (business.subscription_status === "trial") {
        if (new Date() < new Date(business.trial_ends_at)) {
          setAllowed(true);
        } else {
          setAllowed(false);
        }
        setLoading(false);
        return;
      }

      if (
        business.subscription_status === "active" ||
        business.subscription_status === "lifetime_free"
      ) {
        setAllowed(true);
        setLoading(false);
        return;
      }

      setAllowed(false);
      setLoading(false);
    };

    // 1️⃣ sesión inicial
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) checkAccess(data.session);
    });

    // 2️⃣ escuchar cambios (CLAVE)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) checkAccess(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading || allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-900">
        <div className="px-4 py-3 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse"></span>
          <p className="text-white/80 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
