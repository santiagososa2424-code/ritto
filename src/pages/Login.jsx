import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900/70 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center text-slate-950 text-2xl font-bold shadow-inner">
            R
          </div>
          <h1 className="text-xl font-semibold mt-3">Iniciar sesión</h1>
          <p className="text-slate-400 text-sm mt-1">Accedé a tu panel</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-sm text-slate-300">Email</label>
            <input
              type="email"
              className="w-full mt-1 bg-slate-900/50 border border-white/10 text-white rounded-2xl p-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@gmail.com"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Contraseña</label>
            <input
              type="password"
              className="w-full mt-1 bg-slate-900/50 border border-white/10 text-white rounded-2xl p-3 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-400 text-slate-950 font-semibold py-3 rounded-2xl text-sm hover:bg-emerald-300 transition disabled:opacity-50"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="flex justify-between text-xs text-slate-400 mt-5 px-1">
          <Link to="/forgot-password" className="hover:text-white">
            ¿Olvidaste tu contraseña?
          </Link>
          <Link to="/register" className="hover:text-white">
            Crear cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
