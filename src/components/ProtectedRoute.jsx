import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ProtectedRoute({ children }) {
  const [allowed, setAllowed] = useState(null);
  const [redirect, setRedirect] = useState(null);

  useEffect(() => {
    const verifyAccess = async () => {
      // 1️⃣ Sesión
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session) {
        setRedirect("/login");
        setAllowed(false);
        return;
      }

      const user = session.user;

      // 2️⃣ Lifetime free
      if (user.user_metadata?.lifetime_free) {
        setAllowed(true);
        return;
      }

      // 3️⃣ Buscar negocio (⚠️ maybeSingle, NO single)
      const { data: business, error } = await supabase
        .from("businesses")
        .select("plan, trial_ends_at")
        .eq("owner_id", user.id)
        .maybeSingle();

      // 👉 NO TIENE NEGOCIO → SETUP
      if (!business) {
        setRedirect("/setup");
        setAllowed(false);
        return;
      }

      // 4️⃣ Trial
      if (business.plan === "trial") {
        const now = new Date();
        const ends = new Date(business.trial_ends_at);

        if (now < ends) {
          setAllowed(true);
        } else {
          setRedirect("/login");
          setAllowed(false);
        }
        return;
      }

      // 5️⃣ Plan activo
      if (business.plan === "active") {
        setAllowed(true);
        return;
      }

      // 6️⃣ Fallback
      setRedirect("/login");
      setAllowed(false);
    };

    verifyAccess();
  }, []);

  // Loader
  if (allowed === null && !redirect) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-900">
        <div className="px-4 py-3 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse"></span>
          <p className="text-white/80 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Redirect explícito
  if (!allowed && redirect) {
    return <Navigate to={redirect} replace />;
  }

  return children;
}
