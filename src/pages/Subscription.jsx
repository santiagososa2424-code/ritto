import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Subscription() {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [daysLeft, setDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const CHECKOUT_URL =
    "https://zightivavvfcoyuswpuq.supabase.co/functions/v1/create-mercadopago-checkout";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user);

    // obtener la suscripción del usuario
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (sub) {
      setSubscription(sub);

      const now = new Date();
      const expires = new Date(sub.expires_at);

      // calcular días restantes
      const diff = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
      setDaysLeft(diff);
    }

    setLoading(false);
  };

  const handlePayment = async () => {
    setError("");

    try {
      const res = await fetch(CHECKOUT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
        }),
      });

      const data = await res.json();

      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        setError("No se pudo generar el link de pago.");
      }
    } catch (err) {
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
