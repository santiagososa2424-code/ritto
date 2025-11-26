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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="px-4 py-2 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-lg text-xs text-slate-200 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Cargando servicios...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* TÍTULO */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Servicios del negocio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administrá los servicios que tus clientes pueden reservar.
          </p>
        </div>

        {/* ALERTAS */}
        {error && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-200">
            {success}
          </div>
        )}

        {/* FORMULARIO DE CREACIÓN */}
        <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-lg p-6 space-y-6">

          <h2 className="text-lg font-semibold tracking-tight text-emerald-300">
            Agregar nuevo servicio
          </h2>

          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label className="text-[11px] text-slate-300">Nombre</label>
              <input
                type="text"
                className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30 transition"
                placeholder="Corte clásico"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300">Precio (UYU)</label>
              <input
                type="number"
                className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
                placeholder="650"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-300">
                Duración (minutos)
              </label>
              <input
                type="number"
                className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
                placeholder="30"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[11px] text-slate-300">
                Descripción (opcional)
              </label>
              <textarea
                className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm resize-none"
                placeholder="Descripción breve del servicio..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="sm:col-span-2 mt-2 rounded-2xl bg-emerald-400 text-slate-950 font-semibold text-sm py-2.5 hover:bg-emerald-300 transition"
            >
              Crear servicio
            </button>
          </form>
        </div>

        {/* LISTA DE SERVICIOS */}
        <div className="space-y-3">
          {services.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">
              No tenés servicios cargados todavía.
            </p>
          )}

          {services.map((s) => (
            <div
              key={s.id}
              className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow p-5 flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-lg text-slate-50 tracking-tight">
                  {s.name}
                </p>

                <p className="text-[13px] text-slate-300 mt-0.5">
                  ${s.price} · {s.duration} min
                </p>

                {s.description && (
                  <p className="text-[12px] text-slate-400 mt-1">
                    {s.description}
                  </p>
                )}

                <p className="text-[11px] mt-2">
                  Estado:{" "}
                  <span
                    className={
                      s.is_active ? "text-emerald-300" : "text-slate-500"
                    }
                  >
                    {s.is_active ? "Activo" : "Inactivo"}
                  </span>
                </p>
              </div>

              <button
                onClick={() => toggleActive(s)}
                className={`text-xs px-4 py-2 rounded-2xl border backdrop-blur-lg transition ${
                  s.is_active
                    ? "text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10"
                    : "text-slate-300 border-white/10 hover:bg-white/5"
                }`}
              >
                {s.is_active ? "Desactivar" : "Activar"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
