import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function BusinessSetup() {
  const [business, setBusiness] = useState(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositType, setDepositType] = useState("fixed");
  const [depositValue, setDepositValue] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    loadBusiness();
  }, []);

  // ─────────────────────────────
  // GENERADOR DE SLUG LIMPIO
  // ─────────────────────────────
  const generateSlug = (value) => {
    return (
      "ritto" +
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
    );
  };

  const loadBusiness = async () => {
    setError("");
    setSuccess("");

    const {
      data: { user },
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
    setPhone(biz.phone || "");
    setDepositEnabled(biz.deposit_enabled || false);
    setDepositType(biz.deposit_type || "fixed");
    setDepositValue(biz.deposit_value || 0);
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

    let slugToSave = business.slug;

    // ─────────────────────────────
    // SI NO HAY SLUG → LO GENERAMOS
    // ─────────────────────────────
    if (!business.slug) {
      const baseSlug = generateSlug(name);
      let finalSlug = baseSlug;
      let counter = 1;

      while (true) {
        const { data: existing } = await supabase
          .from("businesses")
          .select("id")
          .eq("slug", finalSlug)
          .maybeSingle();

        if (!existing) break;

        counter++;
        finalSlug = `${baseSlug}-${counter}`;
      }

      slugToSave = finalSlug;
    }

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        name,
        slug: slugToSave,
        address,
        map_url: mapUrl,
        email,
        phone,
        deposit_enabled: depositEnabled,
        deposit_type: depositType,
        deposit_value: depositValue,
      })
      .eq("id", business.id);

    if (updateError) {
      console.error(updateError);
      setError("Error guardando los cambios.");
      return;
    }

    setBusiness((prev) => ({ ...prev, slug: slugToSave }));
    setSuccess("Cambios guardados correctamente.");
  };

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        Cargando negocio...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold">Configuración del negocio</h1>
          <p className="text-xs text-slate-400 mt-1">
            Información general visible para tus clientes.
          </p>
        </div>

        {error && <Alert error text={error} />}
        {success && <Alert success text={success} />}

        <div className="rounded-3xl bg-slate-900/70 border border-white/10 p-6 space-y-6">
          <Field label="Nombre del negocio">
            <input
              className="input-ritto"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label="Dirección">
            <input
              className="input-ritto"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Field>

          <Field label="Teléfono de contacto">
            <input
              className="input-ritto"
              placeholder="Ej: 099 123 456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>

          <Field label="Email de contacto">
            <input
              className="input-ritto"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>

          <Field label="Google Maps URL">
            <input
              className="input-ritto"
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
            />
          </Field>

          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4 space-y-3">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={depositEnabled}
                onChange={(e) => setDepositEnabled(e.target.checked)}
              />
              Requerir seña para reservar
            </label>

            {depositEnabled && (
              <>
                <Field label="Tipo de seña">
                  <select
                    className="input-ritto"
                    value={depositType}
                    onChange={(e) => setDepositType(e.target.value)}
                  >
                    <option value="fixed">Monto fijo</option>
                    <option value="percentage">Porcentaje</option>
                  </select>
                </Field>

                <Field label="Valor de la seña">
                  <input
                    type="number"
                    className="input-ritto"
                    value={depositValue}
                    onChange={(e) =>
                      setDepositValue(Number(e.target.value))
                    }
                  />
                </Field>
              </>
            )}
          </div>

          <button onClick={saveBusiness} className="button-ritto">
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function Alert({ error, text }) {
  return (
    <div
      className={`rounded-2xl px-4 py-2 text-xs ${
        error
          ? "bg-rose-500/10 text-rose-200 border border-rose-500/40"
          : "bg-emerald-500/10 text-emerald-200 border border-emerald-500/40"
      }`}
    >
      {text}
    </div>
  );
}
