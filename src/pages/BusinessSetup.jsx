import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function BusinessSetup() {
  const [business, setBusiness] = useState(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [email, setEmail] = useState("");

  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositType, setDepositType] = useState("fixed");
  const [depositValue, setDepositValue] = useState(0);

  const [slotInterval, setSlotInterval] = useState(30);

  const [workingDays, setWorkingDays] = useState({
    Lunes: true,
    Martes: true,
    Miércoles: true,
    Jueves: true,
    Viernes: true,
    Sábado: true,
    Domingo: false,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  // ----------------------------------------
  // CARGAR DATOS DEL NEGOCIO
  // ----------------------------------------
  const loadData = async () => {
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (!biz) {
      setError("No tenés un negocio creado.");
      return;
    }

    setBusiness(biz);

    // completar campos
    setName(biz.name || "");
    setAddress(biz.address || "");
    setMapUrl(biz.map_url || "");
    setEmail(biz.email || "");

    setDepositEnabled(biz.deposit_enabled || false);
    setDepositType(biz.deposit_type || "fixed");
    setDepositValue(biz.deposit_value || 0);

    setSlotInterval(biz.slot_interval_minutes || 30);

    if (biz.working_days) {
      setWorkingDays(biz.working_days);
    }
  };

  // ----------------------------------------
  // GUARDAR CAMBIOS
  // ----------------------------------------
  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("El nombre del negocio es obligatorio.");
      return;
    }

    if (!email.trim()) {
      setError("El email del negocio es obligatorio.");
      return;
    }

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        name,
        address,
        map_url: mapUrl,
        email,
        deposit_enabled: depositEnabled,
        deposit_type: depositType,
        deposit_value: depositValue,
        slot_interval_minutes: slotInterval,
        working_days: workingDays,
      })
      .eq("id", business.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Cambios guardados correctamente.");
  };

  if (!business) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        {error || "Cargando negocio..."}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-700 mb-6">
        Configuración del negocio
      </h1>

      {/* Errores */}
      {error && (
        <p className="mb-4 text-red-600 bg-red-50 p-3 rounded">{error}</p>
      )}
      {success && (
        <p className="mb-4 text-green-600 bg-green-50 p-3 rounded">{success}</p>
      )}

      {/* FORMULARIO */}
      <div className="bg-white border rounded-xl shadow-sm p-6">
        
        {/* Nombre */}
        <label className="block mb-2 font-semibold text-gray-700">
          Nombre del negocio
        </label>
        <input
          type="text"
          className="border rounded w-full p-2 mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Dirección */}
        <label className="block mb-2 font-semibold text-gray-700">Dirección</label>
        <input
          type="text"
          className="border rounded w-full p-2 mb-4"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        {/* Email */}
        <label className="block mb-2 font-semibold text-gray-700">
          Email del negocio (para notificaciones)
        </label>
        <input
          type="email"
          className="border rounded w-full p-2 mb-4"
          placeholder="tubeneficio@ritto.lat"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Mapa */}
        <label className="block mb-2 font-semibold text-gray-700">
          Google Maps (URL)
        </label>
        <input
          type="text"
          className="border rounded w-full p-2 mb-6"
          placeholder="https://maps.google.com/..."
          value={mapUrl}
          onChange={(e) => setMapUrl(e.target.value)}
        />

        {/* SEÑA */}
        <div className="border rounded-lg p-4 mb-6">
          <label className="flex items-center gap-2 font-semibold text-gray-700 mb-3">
            <input
              type="checkbox"
              checked={depositEnabled}
              onChange={(e) => setDepositEnabled(e.target.checked)}
            />
            Requerir seña para reservar
          </label>

          {depositEnabled && (
            <>
              <label className="block text-sm font-medium mb-1">Tipo de seña</label>
              <select
                className="border rounded w-full p-2 mb-3"
                value={depositType}
                onChange={(e) => setDepositType(e.target.value)}
              >
                <option value="fixed">Monto fijo</option>
                <option value="percentage">Porcentaje del servicio</option>
              </select>

              <label className="block text-sm font-medium mb-1">
                Valor de seña
              </label>
              <input
                type="number"
                min={1}
                className="border rounded w-full p-2 mb-2"
                value={depositValue}
                onChange={(e) => setDepositValue(Number(e.target.value))}
              />
            </>
          )}
        </div>

        {/* INTERVALO */}
        <label className="block text-sm font-semibold mb-2 text-gray-700">
          Intervalo base de agenda
        </label>
        <select
          className="border p-2 rounded mb-6"
          value={slotInterval}
          onChange={(e) => setSlotInterval(Number(e.target.value))}
        >
          <option value={15}>Cada 15 min</option>
          <option value={20}>Cada 20 min</option>
          <option value={30}>Cada 30 min (recomendado)</option>
          <option value={45}>Cada 45 min</option>
          <option value={60}>Cada 60 min</option>
        </select>

        {/* DÍAS HÁBILES */}
        <h3 className="text-sm font-semibold mb-2 text-gray-700">
          Días que trabaja el negocio
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          {Object.keys(workingDays).map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={workingDays[d]}
                onChange={(e) =>
                  setWorkingDays({ ...workingDays, [d]: e.target.checked })
                }
              />
              {d}
            </label>
          ))}
        </div>

        {/* GUARDAR */}
        <button
          onClick={handleSave}
          className="bg-blue-700 hover:bg-blue-800 text-white w-full py-3 rounded font-semibold"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
}
