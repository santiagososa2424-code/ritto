import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ProtectedRoute({ children }) {
  const [allowed, setAllowed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const checkAccess = async (session) => {
      if (!session) {
        if (!mounted) return;
        setHasSession(false);
        setAllowed(false);
        setLoading(false);
        return;
      }

      setHasSession(true);

      const user = session.user;

      // lifetime_free (metadata)
      if (user.user_metadata?.lifetime_free) {
        if (!mounted) return;
        setAllowed(true);
        setLoading(false);
        return;
      }

      const { data: business } = await supabase
        .from("businesses")
        .select("subscription_status, trial_ends_at, subscription_paid_until")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!business) {
        if (!mounted) return;
        setAllowed(false);
        setLoading(false);
        return;
      }

      const now = new Date();

      // ✅ PRIORIDAD: PLAN ACTIVO > TRIAL
      const paidUntilDate = business.subscription_paid_until
        ? new Date(business.subscription_paid_until)
        : null;

      const hasActivePlan =
        paidUntilDate &&
        !Number.isNaN(paidUntilDate.getTime()) &&
        paidUntilDate.getTime() > now.getTime();

      if (hasActivePlan) {
        if (!mounted) return;
        setAllowed(true);
        setLoading(false);
        return;
      }

      // lifetime_free (db)
      if (business.subscription_status === "lifetime_free") {
        if (!mounted) return;
        setAllowed(true);
        setLoading(false);
        return;
      }

      // trial
      if (business.subscription_status === "trial") {
        const trialEnds = business.trial_ends_at ? new Date(business.trial_ends_at) : null;
        const trialOk =
          trialEnds &&
          !Number.isNaN(trialEnds.getTime()) &&
          now.getTime() < trialEnds.getTime();

        if (!mounted) return;
        setAllowed(!!trialOk);
        setLoading(false);
        return;
      }

      // active sin paid_until válido => no permitido
      if (!mounted) return;
      setAllowed(false);
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) checkAccess(data?.session || null);
    });

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

  if (loading || allowed === null || hasSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-900">
        <div className="px-4 py-3 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse"></span>
          <p className="text-white/80 text-sm">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // ✅ No hay sesión => login
  if (!hasSession) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // ✅ Hay sesión pero no acceso => paywall
  if (!allowed) {
    if (location.pathname !== "/paywall") {
      return <Navigate to="/paywall" replace />;
    }
  }

  const isDashboard = location.pathname === "/dashboard";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-900 text-slate-50">
      {!isDashboard && (
        <div className="px-6 pt-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition"
          >
            <span className="text-lg">←</span>
            Volver al Dashboard
          </button>
        </div>
      )}

      {children}
    </div>
  );
}
