import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Completá todos los campos.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("Email o contraseña incorrectos.");
      return;
    }

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center px-6">

      {/* CONTENEDOR PRINCIPAL */}
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.25)] bg-[#0D1326] flex flex-col md:flex-row border border-[#1C243A]">

        {/* BRANDING APPLE STYLE */}
        <div className="md:w-1/2 p-10 flex flex-col justify-between 
                        bg-gradient-to-b from-[#0D142A] to-[#0A0F1F] text-white">

          {/* LOGO + TÍTULO */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <img src="/ritto-logo.svg" className="h-12 drop-shadow-xl" />
              <h1 className="text-3xl font-semibold tracking-tight">
                Ritto
              </h1>
            </div>

            <p className="text-sm text-blue-100/80 leading-relaxed">
              La forma más elegante, rápida y automatizada de gestionar tu negocio.
            </p>

            <ul className="mt-6 space-y-3 text-blue-100/70 text-sm">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-green-400"></span>
                Reservas 24/7 con link público.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-green-400"></span>
                Agenda inteligente sin solapamientos.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-green-400"></span>
                Control de capacidad por horario.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-green-400"></span>
                Dashboard premium con reservas del día.
              </li>
            </ul>
          </div>

          {/* FOOTER */}
          <div className="mt-10 text-xs text-blue-100/40">
            <p>Soporte: 093 403 706</p>
            <p>Hecho en Uruguay 🇺🇾</p>
          </div>
        </div>

        {/* FORMULARIO APPLE CLEAN */}
        <div className="md:w-1/2 p-10 bg-[#0A0F1F] text-white flex flex-col justify-center">

          <h2 className="text-2xl font-semibold mb-2">Iniciar sesión</h2>
          <p className="text-sm text-blue-100/60 mb-6">
            Accedé a tu panel inteligente.
          </p>

          {errorMsg && (
            <p className="text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-lg mb-4">
              {errorMsg}
            </p>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">

            {/* EMAIL */}
            <div>
              <label className="block text-sm mb-1 text-blue-100/80">Email</label>
              <input
                type="email"
                className="w-full bg-[#0D142A] border border-[#1D2844] 
                           rounded-xl px-3 py-2.5 text-sm text-blue-100
                           focus:border-blue-500 focus:ring-blue-500 focus:ring-2 outline-none 
                           transition-all"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@mail.com"
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-sm mb-1 text-blue-100/80">Contraseña</label>
              <input
                type="password"
                className="w-full bg-[#0D142A] border border-[#1D2844] 
                           rounded-xl px-3 py-2.5 text-sm text-blue-100 
                           focus:border-blue-500 focus:ring-blue-500 focus:ring-2 outline-none 
                           transition-all"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {/* BOTÓN */}
            <button
              type="submit"
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white 
                         text-sm font-semibold py-3 rounded-xl shadow-lg
                         transition-all active:scale-[0.97]"
            >
              Entrar
            </button>
          </form>

          {/* LINKS */}
          <div className="mt-5 text-sm flex flex-col gap-2">
            <button
              className="text-blue-400 hover:text-blue-300 transition text-left"
              onClick={() => navigate("/forgot-password")}
            >
              ¿Olvidaste tu contraseña?
            </button>

            <button
              className="text-blue-400 hover:text-blue-300 transition text-left"
              onClick={() => navigate("/register")}
            >
              Crear cuenta nueva
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
