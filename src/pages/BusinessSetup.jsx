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
      }
    } catch {
      setError("No se pudo cargar el negocio.");
    }

    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name) {
      setError("El nombre del negocio es obligatorio.");
      return;
    }

    if (depositEnabled && Number(depositValue) <= 0) {
      setError("La seña debe ser mayor a 0.");
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
      };

      let result;

      if (business?.id) {
        result = await supabase
          .from("businesses")
          .update(payload)
          .eq("id", business.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from("businesses")
          .insert(payload)
          .select()
          .single();
      }

      const { data: savedBiz, error: saveError } = result;

      if (saveError) {
        setError(saveError.message);
        setLoading(false);
        return;
      }

      setBusiness(savedBiz);
      setSuccess("Datos guardados correctamente.");
    } catch {
      setError("Error guardando los datos.");
    }

    setLoading(false);
  };

  if (loading && !business) {
    return <div className="p-6">Cargando configuración...</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-700 mb-6">
        Configuración del negocio
      </h1>

      {error && (
        <p className="bg-red-100 text-red-800 p-3 rounded mb-4">{error}</p>
      )}

      {success && (
        <p className="bg-green-100 text-green-800 p-3 rounded mb-4">
          {success}
        </p>
      )}

      <div className="bg-white shadow-lg rounded-xl p-6 border">

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre del negocio
            </label>
            <input
              type="text"
              className="border rounded-lg w-full p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Barbería La Covacha"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Teléfono
            </label>
            <input
              type="text"
              className="border rounded-lg w-full p-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ej: 099 123 456"
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              className="border rounded-lg w-full p-2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ej: 18 de Julio 1234"
            />
          </div>

          {/* Seña */}
          <div className="pt-4 border-t">
            <h2 className="text-lg font-semibold text-blue-700 mb-2">
              Seña para reservas
            </h2>

            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={depositEnabled}
                onChange={(e) => setDepositEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm text-slate-700">
                Requerir seña para confirmar los turnos
              </span>
            </label>

            {depositEnabled && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tipo de seña
                  </label>
                  <select
                    className="border rounded-lg w-full p-2"
                    value={depositType}
                    onChange={(e) => setDepositType(e.target.value)}
                  >
                    <option value="fixed">Monto fijo ($)</option>
                    <option value="percentage">Porcentaje (%)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {depositType === "fixed"
                      ? "Monto en pesos"
                      : "Porcentaje del servicio (%)"}
                  </label>
                  <input
                    type="number"
                    className="border rounded-lg w-full p-2"
                    value={depositValue}
                    onChange={(e) => setDepositValue(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white w-full p-3 rounded-lg font-semibold transition"
          >
            Guardar cambios
          </button>
        </form>
      </div>
    </div>
  );
}
