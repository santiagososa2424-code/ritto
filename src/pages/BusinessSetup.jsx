import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function BusinessSetup() {
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositType, setDepositType] = useState("fixed");
  const [depositValue, setDepositValue] = useState(0);

  const [capacity, setCapacity] = useState(1); // ⚡ NUEVO

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    loadBusiness();
  }, []);

  const createSlug = (text) =>
    text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");

  const loadBusiness = async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: biz } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (biz) {
        setBusiness(biz);
        setName(biz.name || "");
        setPhone(biz.phone || "");
        setAddress(biz.address || "");

        setDepositEnabled(Boolean(biz.deposit_enabled));
        setDepositType(biz.deposit_type || "fixed");
        setDepositValue(Number(biz.deposit_value || 0));

        setCapacity(biz.capacity_per_slot || 1); // ⚡ NUEVO
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Error cargando los datos del negocio.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name) {
      setError("El nombre del negocio es obligatorio.");
      return;
    }

    if (depositEnabled && (!depositValue || Number(depositValue) <= 0)) {
      setError("La seña debe ser mayor a 0.");
      return;
    }

    if (capacity < 1) {
      setError("La capacidad mínima es 1.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const slug = business?.slug || createSlug(name);

      const payload = {
        owner_id: user.id,
        name,
        phone,
        address,
        slug,
        deposit_enabled: depositEnabled,
        deposit_type: depositEnabled ? depositType : null,
        deposit_value: depositEnabled ? Number(depositValue) : 0,
        requires_deposit: depositEnabled,

        capacity_per_slot: Number(capacity), // ⚡ NUEVO
      };

      let query = supabase.from("businesses");
      let result;

      if (business?.id) {
        result = await query.update(payload).eq("id", business.id).select().single();
      } else {
        result = await query.insert(payload).select().single();
      }

      const { error: upsertError } = result;

      if (upsertError) {
        setError(upsertError.message);
        setLoading(false);
        return;
      }

      setSuccess("Datos del negocio guardados correctamente.");
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al guardar los datos.");
      setLoading(false);
    }
  };

  if (loading && !business && !name) {
    return <div className="p-6">Cargando configuración del negocio...</div>;
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Configuración del negocio</h1>

      {error && <p className="mb-3 text-red-600 text-sm">{error}</p>}
      {success && <p className="mb-3 text-green-600 text-sm">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium mb-1">Nombre del negocio</label>
          <input
            type="text"
            className="border rounded w-full p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium mb-1">Teléfono del local</label>
          <input
            type="text"
            className="border rounded w-full p-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium mb-1">Dirección del local</label>
          <input
            type="text"
            className="border rounded w-full p-2"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        {/* CAPACIDAD POR HORARIO */}
        <div className="mt-4 border-t pt-4">
          <h2 className="text-lg font-semibold mb-1">Capacidad por franja horaria</h2>
          <p className="text-xs text-gray-600 mb-2">
            ¿Cuántas reservas aceptás al mismo tiempo por horario?
          </p>

          <input
            type="number"
            className="border rounded w-full p-2"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>

        {/* DEPÓSITO */}
        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold mb-2">Seña para reservar turno</h2>

          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={depositEnabled}
              onChange={(e) => setDepositEnabled(e.target.checked)}
            />
            <label className="text-sm">Requerir seña para confirmar reservas</label>
          </div>

          {depositEnabled && (
            <div className="border rounded p-3 bg-gray-50 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de seña</label>
                <select
                  className="border rounded w-full p-2"
                  value={depositType}
                  onChange={(e) => setDepositType(e.target.value)}
                >
                  <option value="fixed">Monto fijo</option>
                  <option value="percentage">Porcentaje</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {depositType === "fixed" ? "Monto" : "Porcentaje"}
                </label>
                <input
                  type="number"
                  className="border rounded w-full p-2"
                  value={depositValue}
                  onChange={(e) => setDepositValue(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded font-semibold"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
