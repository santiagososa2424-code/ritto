import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import Paywall from "./Paywall";

export default function RequireActiveAccess({ children }) {
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);

  const navigate = useNavigate();

  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          navigate("/login");
          return;
        }

        const user = session.user;

        const { data: biz, error } = await supabase
          .from("businesses")
          .select("subscription_status, subscription_paid_until, trial_ends_at")
          .eq("owner_id", user.id)
          .maybeSingle();

        if (error || !biz) {
          // si no hay negocio, no bloqueamos acá: mandalo a setup
          navigate("/setup");
          return;
        }

        const subscription = biz.subscription_status || null;
        const isLifetime = subscription === "lifetime_free";

        const paidUntilMs = biz.subscription_paid_until
          ? Date.parse(biz.subscription_paid_until)
          : NaN;

        const hasActivePlan =
          !Number.isNaN(paidUntilMs) && paidUntilMs > now.getTime();

        const isTrial = subscription === "trial";
        const trialEndsMs = biz.trial_ends_at ? Date.parse(biz.trial_ends_at) : NaN;

        const trialExpired =
          isTrial && (Number.isNaN(trialEndsMs) ? true : trialEndsMs <= now.getTime());

        const shouldBlock = !isLifetime && !hasActivePlan && trialExpired;

        setBlocked(shouldBlock);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-900">
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-black text-4xl font-extrabold animate-pulse shadow-xl">
            R
          </div>
          <p className="text-white/80 animate-pulse">Cargando...</p>
        </div>
      </div>
    );
  }

  if (blocked) return <Paywall />;

  return children;
}
