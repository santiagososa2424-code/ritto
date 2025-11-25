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
  const [depositType, setDepositType] = useState("fixed"); // "fixed" | "percentage"
  const [depositValue, setDepositValue] = useState(0);

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

      if (bizError && bizError.code !== "PGRST116") {
        setError(bizError.message);
        setLoading(false);
        return;
      }

      if (biz) {
        setBusiness(biz);
        setName(biz.name || "");
        setPhone(biz.phone || "");
        setAddress(biz.address || "");
        setDepositEnabled(Boolean(biz.deposit_enabled));
        setDepositType(biz.deposit_type || "fixed");
        setDepositValue(Number(biz.deposit_value || 0));
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

    setLoading(true);

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
        // por si existe en tu schema
        requires_deposit: depositEnabled,
      };

      let query = supabase.from("businesses");
      let result;

      if (business?.id) {
        result = await query.update(payload).eq("id", business.id).select().single();
      } else {
        result = await query.insert(payload).select().single();
      }

      const { data: newBiz, error: upsertError } = result;

      if (upsertError) {
        setError(upsertError.message);
        setLoading(false);
        return;
      }

      setBusiness(newBiz);
      setSuccess("Datos del negocio guardados correctamente.");
      setLoading(false);

      // Si querés mandarlo al dashboard:
      // navigate("/dashboard");
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
        <div>
          <label className="block text-sm font-medium mb-1">
            Nombre del negocio
          </label>
          <input
            type="text"
            className="border rounded w-full p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Barbería La Covacha"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Teléfono del local
          </label>
          <input
            type="text"
            className="border rounded w-full p-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: 099 123 456"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Dirección del local
          </label>
          <input
            type="text"
            className="border rounded w-full p-2"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej: 18 de Julio 1234"
          />
        </div>

        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold mb-2">
            Seña para reservar turno
          </h2>

          <div className="flex items-center gap-2 mb-3">
            <input
              id="depositEnabled"
              type="checkbox"
              checked={depositEnabled}
              onChange={(e) => setDepositEnabled(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="depositEnabled" className="text-sm">
              Requerir seña para confirmar las reservas
            </label>
          </div>

          {depositEnabled && (
            <div className="space-y-3 ml-1 border rounded p-3 bg-gray-50">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipo de seña
                </label>
                <select
                  className="border rounded w-full p-2"
                  value={depositType}
                  onChange={(e) => setDepositType(e.target.value)}
                >
                  <option value="fixed">Monto fijo (en pesos)</option>
                  <option value="percentage">
                    Porcentaje del valor del servicio
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {depositType === "fixed"
                    ? "Monto de la seña (en pesos)"
                    : "Porcentaje de seña (%)"}
                </label>
                <input
                  type="number"
                  className="border rounded w-full p-2"
                  value={depositValue}
                  onChange={(e) => setDepositValue(e.target.value)}
                  min="0"
                  step="1"
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded font-semibold disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
