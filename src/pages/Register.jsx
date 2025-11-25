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

    // Crear usuario en AUTH
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

    // Trial de 30 días
    const now = new Date();
    const expires = new Date();
    expires.setDate(now.getDate() + 30);

    await supabase.from("subscriptions").insert({
      user_id: userId,
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
      active: true,
    });

    // Redirigir al Dashboard
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 border border-gray-100">

        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <img src="/ritto-logo.svg" alt="Ritto" className="h-12" />
        </div>

        <h1 className="text-2xl font-bold text-center text-blue-700 mb-2">
          Crear tu cuenta
        </h1>

        <p className="text-center text-gray-500 mb-6">
          Comenzá gratis — 30 días de prueba
        </p>

        {error && (
          <p className="text-red-600 text-center font-medium mb-4">{error}</p>
        )}

        <form onSubmit={handleRegister} className="space-y-4">

          <div>
            <label className="block mb-1 font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">Apellido</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              placeholder="Pérez"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">Teléfono</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09X XXX XXX"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@email.com"
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Crear cuenta
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          ¿Ya tenés cuenta?{" "}
          <a href="/login" className="text-blue-600 font-medium hover:underline">
            Iniciar sesión
          </a>
        </p>
      </div>
    </div>
  );
}
