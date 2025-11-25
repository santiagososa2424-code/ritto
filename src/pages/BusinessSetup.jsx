import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function BusinessSetup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  // Campos para SEÑA
  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositType, setDepositType] = useState("percentage");
  const [depositValue, setDepositValue] = useState(0);

  const navigate = useNavigate();

  const createSlug = (text) =>
    text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const slug = createSlug(name);

    const { error: insertError } = await supabase.from("businesses").insert({
      owner_id: user.id,
      name,
      phone,
      address,
      slug,
      // Guardar datos de seña
      deposit_enabled: depositEnabled,
      deposit_type: depositType,
      deposit_value: depositValue,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    navigate("/dashboard");
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Configurar mi negocio</h1>

      {error && <p className="text-red-500">{error}</p>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Nombre del negocio"
          className="border p-2 rounded"
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="text"
          placeholder="Teléfono del local"
          className="border p-2 rounded"
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          type="text"
          placeholder="Dirección del local"
          className="border p-2 rounded"
          onChange={(e) => setAddress(e.target.value)}
        />

        {/* SECCIÓN DE SEÑA */}
        <div className="mt-6 p-4 border rounded-lg">
          <h2 className="text-xl font-bold mb-3">Seña / Depósito</h2>

          <label className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              checked={depositEnabled}
              onChange={(e) => setDepositEnabled(e.target.checked)}
            />
            Activar seña para reservas
          </label>

          {depositEnabled && (
            <>
              <label className="block mb-2 font-semibold">
                Tipo de seña
              </label>
              <select
                className="border p-2 w-full rounded mb-3"
                value={depositType}
                onChange={(e) => setDepositType(e.target.value)}
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo ($)</option>
              </select>

              <label className="block mb-2 font-semibold">Valor</label>
              <input
                type="number"
                className="border p-2 w-full rounded"
                value={depositValue}
                onChange={(e) =>
                  setDepositValue(Number(e.target.value))
                }
                min="0"
              />
            </>
          )}
        </div>

        <button
          type="submit"
          className="bg-black text-white p-2 rounded font-semibold mt-4"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
