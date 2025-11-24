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
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (!sub) {
        // No tiene suscripción creada → recién registrado → permitir por ahora
        setAllowed(true);
        return;
      }

      const now = new Date();
      const expires = new Date(sub.expires_at);

      if (expires > now || sub.active === true) {
        // Trial todavía vigente o suscripción acti
