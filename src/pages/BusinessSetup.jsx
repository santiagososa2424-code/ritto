import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function BusinessSetup() {
  const [loading, setLoading] = useState(true);
  const [business, setBusiness] = useState(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // ⚡ NUEVO → Días laborales
  const [workingDays, setWorkingDays] = useState([
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ]);

  const weekDays = [
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
  ];

  const toggleDay = (day) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

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

      if (!user) {
        setError("No se pudo obtener el usuario.");
        setLoading(false);
        return;
      }

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

        // ⚡ cargar días laborales
        if (biz.working_days) {
          setWorkingDays(biz.working_days);
        }

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
      } = await supabase.auth.getUser();

      if (!user) {
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

        // ⚡ guardar días laborales
        working_days: workingDays,

        deposit_enabled: depositEnabled,
        deposit_type: depositEnabled ? depositType : null,
        deposit_value: depositEnabled ? Number(depositValue) : 0,
        requires_deposit: depositEnabled,
      };

      let query = supabase.from("businesses");
      let result;

      if (business?.id) {
        result = await query.update(payload).eq("id", business.id).select().single();
      } else {
        result = await query.insert(payload).select().single();
      }

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      setBusiness(result.data);
      setSuccess("Datos del negocio guardados correctamente.");
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al guardar los datos.");
      setLoading(false);
    }
  };

  if (loading) {
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

        {/* ⚡ NUEVO: DÍAS LABORALES */}
        <div className="mt-6 border rounded p-4 bg-gray-50">
          <h2 className="text-lg font-semibold mb-3">Días laborales</h2>
          <p className="text-sm text-gray-600 mb-3">
            Seleccioná los días en los que tu negocio recibe reservas.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {weekDays.map((day) => (
              <label key={day} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={workingDays.includes(day)}
                  onChange={() => toggleDay(day)}
                />
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </label>
            ))}
          </div>
        </div>

        {/* Seña */}
        <div className="mt-6 border-t pt-4">
          <h2 className="text-lg font-semibold mb-2">Seña para reservar turno</h2>

          <div className="flex items-center gap-2 mb-3">
            <input
              id="depositEnabled"
              type="checkbox"
              checked={depositEnabled}
              onChange={(e) => setDepositEnabled(e.target.checked)}
            />
            <label htmlFor="depositEnabled" className="text-sm">
              Requerir seña para confirmar las reservas
            </label>
          </div>

          {depositEnabled && (
            <div className="space-y-3 ml-1 border rounded p-3 bg-gray-50">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de seña</label>
                <select
                  className="border rounded w-full p-2"
                  value={depositType}
                  onChange={(e) => setDepositType(e.target.value)}
                >
                  <option value="fixed">Monto fijo (en pesos)</option>
                  <option value="percentage">Porcentaje del valor del servicio</option>
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
                />
              </div>
            </div>
          )}
        </div>

        {/* Guardar */}
        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded font-semibold w-full"
        >
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
