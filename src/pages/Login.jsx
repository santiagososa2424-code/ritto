import { useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      toast.error("Completá todos los campos.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    toast.success("¡Bienvenido de nuevo!");
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-900">
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-black text-4xl font-extrabold animate-pulse shadow-xl">
            R
          </div>
          <p className="text-white/70 animate-pulse">Ingresando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-900 text-white flex items-center justify-center px-6">

      <div className="
        w-full max-w-md 
        bg-white/10 
        border border-white/20 
        backdrop-blur-2xl 
        rounded-3xl 
        p-10 
        shadow-2xl
        animate-fadeIn
      ">

        <div className="flex flex-col items-center mb-10">
          <div className="
            h-16 w-16 rounded-3xl 
            bg-gradient-to-br from-blue-400 to-cyan-300
            flex items-center justify-center
            text-black text-3xl font-bold
            shadow-inner
            animate-popIn
          ">
            R
          </div>

          <h1 className="text-2xl font-semibold mt-4 tracking-tight">
            Iniciar sesión
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Accedé a tu panel Ritto
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-sm text-slate-200">Email</label>
            <input
              type="email"
              className="input-ritto mt-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@gmail.com"
            />
          </div>

          <div>
            <label className="text-sm text-slate-200">Contraseña</label>
            <input
              type="password"
              className="input-ritto mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="button-ritto"
          >
            Ingresar
          </button>
        </form>

        <div className="flex justify-between text-xs text-slate-400 mt-6 px-1">
          <Link to="/forgot-password" className="hover:text-white transition">
            ¿Olvidaste tu contraseña?
          </Link>

          <Link to="/register" className="hover:text-white transition">
            Crear cuenta
          </Link>
        </div>

      </div>
    </div>
  );
}
