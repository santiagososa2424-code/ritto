import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function BusinessSetup() {
  const [business, setBusiness] = useState(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  // const [mapUrl, setMapUrl] = useState(""); // (ELIMINADO)
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [depositEnabled, setDepositEnabled] = useState(false);
  // mantenemos en state por compat, pero solo permitimos fixed
  const [depositType, setDepositType] = useState("fixed");

  // FIX: input como string para poder borrar el 0
  const [depositValue, setDepositValue] = useState("");

  // NUEVO: transferencia (solo si seña activa)
  const [depositBank, setDepositBank] = useState("");
  const [depositAccountName, setDepositAccountName] = useState("");
  const [depositTransferAlias, setDepositTransferAlias] = useState("");

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
    // setMapUrl(biz.map_url || ""); // (ELIMINADO)
    setEmail(biz.email || "");
    setPhone(biz.phone || "");

    setDepositEnabled(biz.deposit_enabled || false);

    // Solo fixed (por ahora). Si había percentage guardado, lo forzamos a fixed en UI.
    setDepositType("fixed");

    // FIX: string (si viene null/0, mostramos "0" o "" según preferencia)
    const dv = biz.deposit_value;
    setDepositValue(dv === null || dv === undefined ? "" : String(dv));

    // NUEVO: datos de transferencia
    setDepositBank(biz.deposit_bank || "");
    setDepositAccountName(biz.deposit_account_name || "");
    setDepositTransferAlias(biz.deposit_transfer_alias || "");
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

    // Si activa seña, pedimos los datos mínimos de transferencia
    if (depositEnabled) {
      if (!String(depositValue || "").trim()) {
        setError("Ingresá el valor de la seña.");
        return;
      }
      if (!depositBank.trim() || !depositAccountName.trim() || !depositTransferAlias.trim()) {
        setError("Completá Banco, Nombre y Alias para transferencias.");
        return;
      }
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

    // FIX: convertir depositValue string -> number (seguro)
    const parsedDepositValue = depositEnabled
      ? Math.max(0, parseInt(String(depositValue || "0"), 10) || 0)
      : 0;

    const { error: updateError } = await supabase
      .from("businesses")
      .update({
        name,
        slug: slugToSave,
        address,
        // map_url: mapUrl, // (ELIMINADO)
        email,
        phone,
        deposit_enabled: depositEnabled,
        deposit_type: "fixed", // forzado
        deposit_value: parsedDepositValue,

        // NUEVO: transferencia
        deposit_bank: depositEnabled ? depositBank : null,
        deposit_account_name: depositEnabled ? depositAccountName : null,
        deposit_transfer_alias: depositEnabled ? depositTransferAlias : null,
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

          {/* Google Maps URL ELIMINADO */}

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
                {/* Tipo de seña: solo Monto fijo (sin porcentaje) */}
                <Field label="Tipo de seña">
                  <select
                    className="input-ritto"
                    value={depositType}
                    onChange={(e) => setDepositType(e.target.value)}
                    disabled
                  >
                    <option value="fixed">Monto fijo</option>
                  </select>
                </Field>

                <Field label="Valor de la seña">
                  <input
                    type="number"
                    className="input-ritto"
                    value={depositValue}
                    onChange={(e) => setDepositValue(e.target.value)}
                    placeholder="Ej: 200"
                    min="0"
                  />
                </Field>

                {/* NUEVO: Datos de transferencia */}
                <div className="pt-2 border-t border-white/10 space-y-4">
                  <p className="text-[11px] text-slate-400">
                    Estos datos se muestran al cliente cuando la seña está activa.
                  </p>

                  <Field label="Banco">
                    <input
                      className="input-ritto"
                      placeholder="Ej: Itaú / BROU / Santander"
                      value={depositBank}
                      onChange={(e) => setDepositBank(e.target.value)}
                    />
                  </Field>

                  <Field label="Nombre del titular">
                    <input
                      className="input-ritto"
                      placeholder="Ej: Juan Pérez"
                      value={depositAccountName}
                      onChange={(e) => setDepositAccountName(e.target.value)}
                    />
                  </Field>

                  <Field label="Alias para transferencias">
                    <input
                      className="input-ritto"
                      placeholder="Ej: mi.negocio.uy"
                      value={depositTransferAlias}
                      onChange={(e) => setDepositTransferAlias(e.target.value)}
                    />
                  </Field>
                </div>
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
