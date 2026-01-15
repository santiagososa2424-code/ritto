import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Subscription() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [daysLeft, setDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setError("");
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUser(user);

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("id, subscription_status, trial_ends_at")
      .eq("owner_id", user.id)
      .single();

    if (bizErr || !biz) {
      setSubscription(null);
      setDaysLeft(0);
      setLoading(false);
      return;
    }

    const now = new Date();
    const trialEndsDate = biz.trial_ends_at ? new Date(biz.trial_ends_at) : null;

    const msDiff =
      trialEndsDate && !Number.isNaN(trialEndsDate.getTime())
        ? trialEndsDate.getTime() - now.getTime()
        : null;

    const diffDays =
      msDiff !== null ? Math.ceil(msDiff / (1000 * 60 * 60 * 24)) : 0;

    const subObj = {
      active:
        biz.subscription_status === "active" ||
        biz.subscription_status === "lifetime_free",
      status: biz.subscription_status || null,
      expires_at: biz.trial_ends_at || null,
    };

    setSubscription(subObj);
    setDaysLeft(diffDays);
    setLoading(false);
  };

  const handlePayment = async () => {
    setError("");

    if (!user?.id || !user?.email) {
      setError("No se pudo validar el usuario.");
      return;
    }

    try {
      // ✅ Para suscripción: mandamos amount + email (lo que tu Edge Function necesita)
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-mercadopago-checkout",
        {
          body: {
            amount: 690,
            description: "Suscripción Ritto — Plan mensual",
            customer_name: user.email,
            customer_email: user.email,

            // ✅ usamos un destino fijo para suscripción (no slug de negocio)
            // tu function arma back_urls con `https://ritto.lat/${slug}?status=...`
            // entonces le pasamos un slug que sea una ruta real
            slug: "payment-success",
          },
        }
      );

      if (fnError) {
        console.error(fnError);
        setError("No se pudo generar el link de pago.");
        return;
      }

      if (data?.init_point) {
        window.location.href = data.init_point;
        return;
      }

      // por si tu function todavía devuelve { url }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      setError("No se pudo generar el link de pago.");
    } catch (err) {
      console.error(err);
      setError("Hubo un error de conexión.");
    }
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Suscripción de Ritto</h1>

      {!subscription ? (
        <p>No tienes datos de suscripción aún.</p>
      ) : (
        <>
          <p className="mb-2">
            <b>Estado:</b>{" "}
            {subscription.active ? "Activa" : "Inactiva / Trial vencido"}
          </p>

          <p className="mb-4">
            <b>Días restantes:</b>{" "}
            {daysLeft > 0 ? daysLeft : "Tu plan ha vencido"}
          </p>
        </>
      )}

      {error && <p className="text-red-600 mb-3">{error}</p>}

      <button
        onClick={handlePayment}
        className="bg-black text-white p-2 rounded font-semibold w-full"
      >
        Activar agenda por $690 UYU/mes
      </button>
    </div>
  );
}
