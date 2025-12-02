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
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
    setError("");
    setSuccess("");

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/login");
      return;
    }

    const { data: biz, error: bizError } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (bizError || !biz) {
      setError("No se encontró tu negocio. Revisá tu cuenta.");
      return;
    }

    setBusiness(biz);

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

  const saveBusiness = async () => {
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
      setError("Error guardando los cambios.");
      return;
    }

    setSuccess("Cambios guardados correctamente.");
  };

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="px-4 py-2 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl text-xs text-slate-200 flex items-center gap-2">
          <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse"></span>
          Cargando negocio...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Configuración del negocio</h1>
          <p className="text-xs text-slate-400 mt-1">
            Ajustá la información y reglas principales de tu negocio.
          </p>
        </div>

        {/* Notificaciones */}
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

        {/* Card principal */}
        <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-6 space-y-6">

          {/* Nombre */}
          <Field label="Nombre del negocio">
            <input
              type="text"
              className="input-ritto"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          {/* Dirección */}
          <Field label="Dirección">
            <input
              type="text"
              className="input-ritto"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>

          {/* Email */}
          <Field label="Email de contacto">
            <input
              type="email"
              className="input-ritto"
              placeholder="tubeneficio@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          {/* Google Maps */}
          <Field label="Google Maps URL">
            <input
              type="text"
              className="input-ritto"
              placeholder="https://maps.google.com/..."
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
            />
          </Field>

          {/* Seña */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-3">
            <label className="flex items-center gap-2 text-[12px] text-slate-300">
              <input
                type="checkbox"
                checked={depositEnabled}
                onChange={(e) => setDepositEnabled(e.target.checked)}
              />
              Requerir seña para reservar
            </label>

            {depositEnabled && (
              <div className="space-y-3">
                <Field label="Tipo de seña">
                  <select
                    className="input-ritto"
                    value={depositType}
                    onChange={(e) => setDepositType(e.target.value)}
                  >
                    <option value="fixed">Monto fijo</option>
                    <option value="percentage">Porcentaje del servicio</option>
                  </select>
                </Field>

                <Field label="Valor de la seña">
                  <input
                    type="number"
                    className="input-ritto"
                    value={depositValue}
                    onChange={(e) => setDepositValue(Number(e.target.value))}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Intervalo */}
          <Field label="Intervalo base">
            <select
              className="input-ritto"
              value={slotInterval}
              onChange={(e) => setSlotInterval(Number(e.target.value))}
            >
              <option value={15}>Cada 15 min</option>
              <option value={20}>Cada 20 min</option>
              <option value={30}>Cada 30 min (recomendado)</option>
              <option value={45}>Cada 45 min</option>
              <option value={60}>Cada 60 min</option>
            </select>
          </Field>

          {/* Días hábiles */}
          <Field label="Días de trabajo">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.keys(workingDays).map((day) => (
                <label
                  key={day}
                  className="flex items-center gap-2 text-[12px] text-slate-300"
                >
                  <input
                    type="checkbox"
                    checked={workingDays[day]}
                    onChange={(e) =>
                      setWorkingDays({
                        ...workingDays,
                        [day]: e.target.checked
                      })
                    }
                  />
                  {day}
                </label>
              ))}
            </div>
          </Field>

          {/* Guardar */}
          <button
            onClick={saveBusiness}
            className="button-ritto mt-4"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

/* SUB-COMPONENTE PARA UN ESTILO MÁS PRO */
function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[12px] text-slate-300">{label}</label>
      {children}
    </div>
  );
}
