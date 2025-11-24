import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function BusinessSetup() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
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

        <button
          type="submit"
          className="bg-black text-white p-2 rounded font-semibold"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
