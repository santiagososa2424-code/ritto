import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBusiness = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (!data) {
        navigate("/setup");
        return;
      }

      setBusiness(data);
      setLoading(false);
    };

    fetchBusiness();
  }, []);

  if (loading) return <p>Cargando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard de {business.name}</h1>

      <p className="mt-2">Slug público: <b>{business.slug}</b></p>

      <p className="mt-4 text-blue-600 cursor-pointer"
         onClick={() => navigate("/services")}>
        Configurar servicios →
      </p>

      <p className="mt-2 text-blue-600 cursor-pointer"
         onClick={() => navigate("/schedule")}>
        Configurar horarios →
      </p>
    </div>
  );
}
