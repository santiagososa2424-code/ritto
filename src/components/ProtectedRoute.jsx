import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ProtectedRoute({ children }) {
  const [allowed, setAllowed] = useState(null); // null = cargando
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAccess = async () => {
      setLoading(true);

      // 1️⃣ Obtener sesión actual
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (!session) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const user = session.user;

      // 2️⃣ Chequear si tiene lifetime_free
      const lifetime = user.user_metadata?.lifetime_free;

      if (lifetime) {
        setAllowed(true);
        setLoading(false);
        return;
      }

      // 3️⃣ Buscar negocio del usuario
      const { data: business, error: bizError } = await supabase
        .from("businesses")
        .select("plan, trial_starts_at, trial_ends_at")
        .eq("owner_id", user.id)
        .single();

      if (bizError || !business) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      // 4️⃣ Si está en trial
      if (business.plan === "trial") {
        const now = new Date();
        const ends = new Date(business.trial_ends_at);

        if (now < ends) {
          // trial vigente
          setAllowed(true);
        } else {
          // trial vencido
          setAllowed(false);
        }

        setLoading(false);
        return;
      }

      // 5️⃣ Si tiene plan activo pago
      if (business.plan === "active") {
        setAllowed(true);
        setLoading(false);
        return;
      }

      // 6️⃣ Cualquier otro caso → no autorizado
      setAllowed(false);
      setLoading(false);
    };

    verifyAccess();
  }, []);

  // ⏳ LOADER ESTILO APPLE
  if (loading || allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-900">
        <div className="px-4 py-3 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl flex items-center gap-3 animate-fadeIn">
          <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse"></span>
          <p className="text-white/80 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // ❌ Usuario sin acceso → login
  if (!allowed) {
    return <Navigate to="/login" replace />;
  }

  // ✔ Usuario autorizado
  return children;
}
