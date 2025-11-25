import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Services() {
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("No se pudo obtener el usuario.");
        setLoading(false);
        return;
      }

      const { data: biz, error: bizError } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (bizError || !biz) {
        setError("Configurá primero tu negocio.");
        setLoading(false);
        return;
      }

      setBusiness(biz);

      const { data: servs, error: servError } = await supabase
        .from("services")
        .select("*")
        .eq("business_id", biz.id)
        .order("created_at", { ascending: true });

      if (servError) {
        setError(servError.message);
        setLoading(false);
        return;
      }

      setServices(servs || []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Error cargando servicios.");
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!business) {
      setError("No se encontró el negocio.");
      return;
    }

    if (!name || !price || !duration) {
      setError("Completá nombre, precio y duración.");
      return;
    }

    const payload = {
      business_id: business.id,
      name,
      price: Number(price),
      duration: Number(duration),
      description,
      is_active: true,
    };

    const { data, error: insertError } = await supabase
      .from("services")
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setServices((prev) => [...prev, data]);
    setName("");
    setPrice("");
    setDuration(30);
    setDescription("");
    setSuccess("Servicio creado correctamente.");
  };

  const toggleActive = async (service) => {
    const { error: updateError } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setServices((prev) =>
      prev.map((s) =>
        s.id === service.id ? { ...s, is_active: !s.is_active } : s
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-lg">Cargando servicios...</p>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-800 mb-6">Servicios</h1>

      {error && <p className="mb-3 text-red-600 text-sm">{error}</p>}
      {success && <p className="mb-3 text-green-600 text-sm">{success}</p>}

      {/* FORM CARD */}
      <div className="bg-white border rounded-xl p-6 shadow-sm mb-10">
        <h2 className="text-xl font-semibold text-blue-700 mb-4">
          Agregar servicio
        </h2>

        <form onSubmit={handleCreate} className="grid md:grid-cols-4 gap-4">
          <input
            type="text"
            className="border rounded-lg p-2 md:col-span-1"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="number"
            className="border rounded-lg p-2 md:col-span-1"
            placeholder="Precio"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          <input
            type="number"
            className="border rounded-lg p-2 md:col-span-1"
            placeholder="Duración (min)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />

          <button
            type="submit"
            className="bg-blue-600 text-white rounded-lg font-semibold p-2 md:col-span-1 hover:bg-blue-700 transition"
          >
            Agregar
          </button>

          <textarea
            className="border rounded-lg p-2 md:col-span-4"
            placeholder="Descripción (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </form>
      </div>

      {/* LISTA DE SERVICIOS */}
      <div className="space-y-3">
        {services.length === 0 && (
          <p className="text-sm text-gray-600">
            No tenés servicios cargados.
          </p>
        )}

        {services.map((s) => (
          <div
            key={s.id}
            className="bg-white border rounded-xl p-4 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="font-semibold text-blue-700 text-lg">
                {s.name} — ${s.price} ({s.duration} min)
              </p>

              {s.description && (
                <p className="text-sm text-gray-600 mt-1">{s.description}</p>
              )}

              <p className="text-xs mt-2">
                Estado:{" "}
                <span
                  className={
                    s.is_active ? "text-green-600" : "text-gray-500"
                  }
                >
                  {s.is_active ? "Activo" : "Inactivo"}
                </span>
              </p>
            </div>

            <button
              onClick={() => toggleActive(s)}
              className="text-sm px-4 py-1.5 rounded-lg border hover:bg-gray-100 transition"
            >
              {s.is_active ? "Desactivar" : "Activar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
