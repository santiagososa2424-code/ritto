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
      setError("Todavía no creaste un negocio.");
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
    if (biz.working_days) setWorkingDays(biz.working_days);
  };

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
        <div className="px-4 py-2 rounded-3xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-lg text-xs flex items-center gap-2">
          <span className="h-2 w-2 bg-emerald-400 rounded-full animate-pulse" />
          Cargando negocio...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* TÍTULO */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Configuración del negocio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ajustá tu negocio para que los clientes siempre encuentren turnos.
          </p>
        </div>

        {/* NOTIFICACIONES */}
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

        {/* CARD PRINCIPAL */}
        <div className="rounded-3xl bg-slate-900/70 border border-white/10 shadow-[0_18px_60px_rgba(0,0,0,0.65)] backdrop-blur-xl p-6 space-y-6">

          {/* Nombre */}
          <div>
            <label className="text-[12px] text-slate-300">Nombre del negocio</label>
            <input
              type="text"
              className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30 transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Dirección */}
          <div>
            <label className="text-[12px] text-slate-300">Dirección</label>
            <input
              type="text"
              className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30 transition"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Email del negocio */}
          <div>
            <label className="text-[12px] text-slate-300">Email de contacto</label>
            <input
              type="email"
              className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30 transition"
              placeholder="tubeneficio@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Mapa */}
          <div>
            <label className="text-[12px] text-slate-300">Google Maps URL</label>
            <input
              type="text"
              className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/30 transition"
              placeholder="https://maps.google.com/..."
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
            />
          </div>

          {/* SEÑA */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 space-y-3">
            <label className="flex items-center gap-2 text-[12px] text-slate-300 font-medium">
              <input
                type="checkbox"
                checked={depositEnabled}
                onChange={(e) => setDepositEnabled(e.target.checked)}
              />
              Requerir seña para reservar
            </label>

            {depositEnabled && (
              <div className="space-y-3">
                <div>
                  <label className="text-[12px] text-slate-300">Tipo de seña</label>
                  <select
                    className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
                    value={depositType}
                    onChange={(e) => setDepositType(e.target.value)}
                  >
                    <option value="fixed">Monto fijo</option>
                    <option value="percentage">Porcentaje del servicio</option>
                  </select>
                </div>

                <div>
                  <label className="text-[12px] text-slate-300">Valor de seña</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
                    value={depositValue}
                    onChange={(e) => setDepositValue(Number(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* INTERVALO */}
          <div>
            <label className="text-[12px] text-slate-300">Intervalo base</label>
            <select
              className="mt-1 w-full rounded-2xl bg-slate-900/50 border border-white/10 px-3 py-2 text-sm"
              value={slotInterval}
              onChange={(e) => setSlotInterval(Number(e.target.value))}
            >
              <option value={15}>Cada 15 min</option>
              <option value={20}>Cada 20 min</option>
              <option value={30}>Cada 30 min (recomendado)</option>
              <option value={45}>Cada 45 min</option>
              <option value={60}>Cada 60 min</option>
            </select>
          </div>

          {/* DÍAS HÁBILES */}
          <div>
            <label className="text-[12px] text-slate-300">Días de trabajo</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {Object.keys(workingDays).map((d) => (
                <label
                  key={d}
                  className="flex items-center gap-2 text-[12px] text-slate-300"
                >
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
          </div>

          {/* GUARDAR */}
          <button
            onClick={handleSave}
            className="w-full mt-4 rounded-2xl bg-emerald-400 text-slate-950 font-semibold text-sm py-3 hover:bg-emerald-300 transition"
          >
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
