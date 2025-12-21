import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function PublicBusiness() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, [slug]);

  const loadData = async () => {
    const { data: biz, error } = await supabase
      .from("businesses")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !biz) {
      setError("No existe este negocio.");
      return;
    }

    setBusiness(biz);

    const { data: servs } = await supabase
      .from("services")
      .select("id, name, price, duration")
      .eq("business_id", biz.id)
      .eq("is_active", true);

    setServices(servs || []);
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-300">
        {error}
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-300">
        Cargando negocio...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-12">
      <div className="max-w-xl mx-auto space-y-8 text-center">

        <h1 className="text-3xl font-semibold">{business.name}</h1>

        {business.address && (
          <p className="text-sm text-slate-400">{business.address}</p>
        )}

        {business.phone && (
          <p className="text-sm text-slate-400">
            📞 {business.phone}
          </p>
        )}

        <div className="rounded-3xl bg-slate-900/70 border border-white/10 p-6 text-left space-y-4">
          <h2 className="text-lg font-semibold">Servicios</h2>

          {services.length === 0 && (
            <p className="text-sm text-slate-400">
              No hay servicios publicados.
            </p>
          )}

          {services.map((s) => (
            <div
              key={s.id}
              className="flex justify-between text-sm border-b border-white/10 pb-2"
            >
              <span>{s.name}</span>
              <span>
                ${s.price} · {s.duration} min
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate(`/book/${business.slug}`)}
          className="button-ritto w-full text-base"
        >
          Reservar turno
        </button>

        <p className="text-[11px] text-slate-500">
          Reservas gestionadas por Ritto
        </p>
      </div>
    </div>
  );
}
