import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Services() {
  const [services, setServices] = useState([]);
  const [businessId, setBusinessId] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadBusinessAndServices = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Obtener negocio del usuario
      const { data: business } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (!business) {
        navigate("/setup");
        return;
      }

      setBusinessId(business.id);

      // Cargar servicios
      const { data: servicesData } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", business.id);

      setServices(servicesData || []);
    };

    loadBusinessAndServices();
  }, []);

  const handleAddService = async (e) => {
    e.preventDefault();
    setError("");

    const { error: insertError } = await supabase.from("services").insert({
      business_id: businessId,
      name,
      price,
      duration,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    // Recargar servicios
    const { data: servicesData } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", businessId);

    setServices(servicesData || []);
    setName("");
    setPrice("");
    setDuration("");
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4">Servicios</h1>

      {error && <p className="text-red-500 mb-2">{error}</p>}

      <form onSubmit={handleAddService} className="flex flex-col gap-3 mb-6">
        <input
          type="text"
          placeholder="Nombre del servicio"
          className="border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="number"
          placeholder="Precio"
          className="border p-2 rounded"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <input
          type="number"
          placeholder="Duración en minutos"
          className="border p-2 rounded"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />

        <button className="bg-black text-white p-2 rounded font-semibold">
          Agregar servicio
        </button>
      </form>

      <h2 className="text-xl font-semibold mb-2">Servicios creados</h2>

      {services.length === 0 && <p>Aún no agregaste servicios.</p>}

      <ul className="divide-y">
        {services.map((s) => (
          <li key={s.id} className="py-3">
            <b>{s.name}</b> — ${s.price} — {s.duration} min
          </li>
        ))}
      </ul>
    </div>
  );
}
