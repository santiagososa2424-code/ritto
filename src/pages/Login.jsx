import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-full max-w-5xl bg-white shadow-lg rounded-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Columna izquierda: branding / beneficios */}
        <div className="md:w-1/2 bg-blue-600 text-white p-8 flex flex-col justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Ritto
            </h1>
            <p className="mt-2 text-blue-100">
              Tu agenda automática para barberías, salones y consultorios.
            </p>

            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-white"></span>
                <span>Reservas 24/7 con link público por negocio.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-white"></span>
                <span>Horarios que nunca se pisan y control de capacidad.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-white"></span>
                <span>Recordatorios por email y reducción de ausencias.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-white"></span>
                <span>Panel simple para ver todas tus reservas del día.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-white"></span>
                <span>Primer mes gratis, sin tarjeta.</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 text-xs text-blue-100">
            <p>Soporte directo: 093 403 706</p>
            <p>100% desarrollado en Uruguay 🇺🇾</p>
          </div>
        </div>

        {/* Columna derecha: login */}
        <div className="md:w-1/2 p-8">
          <h2 className="text-2xl font-bold mb-2 text-slate-800">
            Iniciar sesión
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Accedé a tu panel de reservas y configuración.
          </p>

          {error && <p className="text-red-500 mb-3">{error}</p>}

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm mb-1 text-slate-700">
                Email
              </label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@mail.com"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-slate-700">
                Contraseña
              </label>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-lg transition"
            >
              Entrar
            </button>
          </form>

          <div className="mt-4 text-sm flex flex-col gap-1">
            <button
              className="text-blue-600 hover:underline text-left"
              onClick={() => navigate("/forgot-password")}
            >
              ¿Olvidaste tu contraseña?
            </button>
            <button
              className="text-blue-600 hover:underline text-left"
              onClick={() => navigate("/register")}
            >
              Crear una cuenta nueva
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
