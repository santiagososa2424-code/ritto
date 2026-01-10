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

  // ----------------------------------------
  // ✏️ EDITAR SERVICIO (NUEVO)
  // ----------------------------------------
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDuration, setEditDuration] = useState(30);
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  // ----------------------------------------
  // 🔥 CARGA DE DATOS
  // ----------------------------------------
  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Tenés que iniciar sesión.");
        setLoading(false);
        return;
      }

      // Traer negocio
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

      // Traer servicios
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

  // ----------------------------------------
  // ➕ CREAR SERVICIO
  // ----------------------------------------
  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

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

  // ----------------------------------------
  // 🔄 ACTIVAR / DESACTIVAR
  // ----------------------------------------
  const toggleActive = async (service) => {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);

    if (error) {
      setError(error.message);
      return;
    }

    setServices((prev) =>
      prev.map((s) =>
        s.id === service.id ? { ...s, is_active: !s.is_active } : s
      )
    );
  };

  // ----------------------------------------
  // ✏️ EDITAR (NUEVO)
  // ----------------------------------------
  const openEdit = (service) => {
    setError("");
    setSuccess("");
    setEditingService(service);

    setEditName(service?.name || "");
    setEditPrice(
      service?.price !== null && service?.price !== undefined ? String(service.price) : ""
    );
    setEditDuration(
      service?.duration !== null && service?.duration !== undefined ? Number(service.duration) : 30
    );
    setEditDescription(service?.description || "");

    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingService(null);

    setEditName("");
    setEditPrice("");
    setEditDuration(30);
    setEditDescription("");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!editingService?.id) {
      setError("No se pudo identificar el servicio a editar.");
      return;
    }

    if (!editName || !editPrice || !editDuration) {
      setError("Completá nombre, precio y duración.");
      return;
    }

    const payload = {
      name: editName,
      price: Number(editPrice),
      duration: Number(editDuration),
      description: editDescription,
    };

    const { data, error: updateError } = await supabase
      .from("services")
      .update(payload)
      .eq("id", editingService.id)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setServices((prev) =>
      prev.map((s) => (s.id === editingService.id ? data : s))
    );

    setSuccess("Servicio actualizado correctamente.");
    closeEdit();
  };

  // ----------------------------------------
  // 🌀 LOADING SCREEN
  // ----------------------------------------
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

  // ----------------------------------------
  // 🧪 UI
  // ----------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* TÍTULO */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Servicios</h1>
          <p className="text-xs text-slate-400 mt-1">
            Administrá todos tus servicios desde aquí.
          </p>
        </div>

        {/* ALERTAS */}
        {error && <Alert text={error} type="error" />}
        {success && <Alert text={success} type="success" />}

        {/* FORM NUEVO SERVICIO */}
        <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-emerald-300 tracking-tight">
            Agregar nuevo servicio
          </h2>

          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <Field label="Nombre">
              <input
                type="text"
                className="input-ritto"
                placeholder="Corte clásico"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>

            <Field label="Precio (UYU)">
              <input
                type="number"
                className="input-ritto"
                placeholder="650"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>

            <Field label="Duración (min)">
              <input
                type="number"
                className="input-ritto"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </Field>

            <Field label="Descripción (opcional)" full>
              <textarea
                className="input-ritto resize-none h-20"
                placeholder="Descripción breve..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>

            <button type="submit" className="button-ritto sm:col-span-2 mt-2">
              Crear servicio
            </button>
          </form>
        </div>

        {/* LISTA DE SERVICIOS */}
        <div className="space-y-4">
          {services.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6">
              Todavía no agregaste servicios.
            </p>
          )}

          {services.map((s) => (
            <div
              key={s.id}
              className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow p-5 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-lg tracking-tight truncate">
                  {s.name}
                </p>
                <p className="text-[13px] text-slate-300">
                  ${s.price} · {s.duration} min
                </p>
                {s.description && (
                  <p className="text-[11px] text-slate-400 mt-1">
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

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(s)}
                  className="px-4 py-2 rounded-2xl text-xs border border-white/10 text-slate-200 hover:bg-white/5 backdrop-blur-xl transition"
                >
                  Editar
                </button>

                <button
                  onClick={() => toggleActive(s)}
                  className={`px-4 py-2 rounded-2xl text-xs border backdrop-blur-xl transition ${
                    s.is_active
                      ? "text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/10"
                      : "text-slate-300 border-white/10 hover:bg-white/5"
                  }`}
                >
                  {s.is_active ? "Desactivar" : "Activar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL EDITAR (NUEVO) */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Editar servicio</p>
                <p className="text-[11px] text-slate-400">
                  Actualizá nombre, precio, duración o descripción.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                className="px-3 py-1.5 rounded-2xl text-[11px] border border-white/10 text-slate-200 hover:bg-white/5 transition"
              >
                Cerrar
              </button>
            </div>

            <form
              onSubmit={handleUpdate}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <Field label="Nombre">
                <input
                  type="text"
                  className="input-ritto"
                  placeholder="Corte clásico"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </Field>

              <Field label="Precio (UYU)">
                <input
                  type="number"
                  className="input-ritto"
                  placeholder="650"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
              </Field>

              <Field label="Duración (min)">
                <input
                  type="number"
                  className="input-ritto"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                />
              </Field>

              <Field label="Descripción (opcional)" full>
                <textarea
                  className="input-ritto resize-none h-20"
                  placeholder="Descripción breve..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </Field>

              <button type="submit" className="button-ritto sm:col-span-2 mt-2">
                Guardar cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------
// SUB-COMPONENTES
// ----------------------------------------

function Field({ label, children, full }) {
  return (
    <div className={`${full ? "sm:col-span-2" : ""} space-y-1`}>
      <label className="text-[11px] text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function Alert({ text, type }) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 text-[12px] ${
        type === "error"
          ? "border border-rose-500/40 bg-rose-500/10 text-rose-200"
          : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      }`}
    >
      {text}
    </div>
  );
}
