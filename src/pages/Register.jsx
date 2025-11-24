import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [lastname, setLastname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const CREATOR_CODE = "lafamiliaspinelli";

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !lastname || !phone || !email || !password) {
      setError("Completa todos los campos.");
      return;
    }

    // Crear usuario en Auth
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          lastname,
          phone,
          creator_code: CREATOR_CODE,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    const userId = data.user.id;

    // CREAR TRIAL DE 30 DÍAS
    const now = new Date();
    const expires = new Date();
    expires.setDate(now.getDate() + 30);

    await supabase.from("subscriptions").insert({
      user_id: userId,
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
      active: true, // trial activo
    });

    // Redirigir al dashboard
    navigate("/dashboard");
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Crear cuenta</h1>

      {error && <p className="text-red-600 mb-3">{error}</p>}

      <form onSubmit={handleRegister} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Nombre"
          className="border p-2 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="text"
          placeholder="Apellido"
          className="border p-2 rounded"
          value={lastname}
          onChange={(e) => setLastname(e.target.value)}
        />

        <input
          type="text"
          placeholder="Teléfono"
          className="border p-2 rounded"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email"
          className="border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Contraseña"
          className="border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="bg-black text-white p-2 rounded font-semibold"
        >
          Registrarme
        </button>
      </form>
    </div>
  );
}
