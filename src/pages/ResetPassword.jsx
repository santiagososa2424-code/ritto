import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    // Si el link vino con recovery, Supabase toma la sesión desde la URL (detectSessionInUrl=true)
    const init = async () => {
      setError("");
      setSuccess("");

      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      // Si no hay sesión, el link es inválido/expiró o la URL config está mal
      if (!session) {
        setError("El enlace es inválido o expiró. Pedí un nuevo reset.");
        setLoading(false);
        return;
      }

      setLoading(false);
    };

    init();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password.trim() || password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const { error: upErr } = await supabase.auth.updateUser({ password });

    if (upErr) {
      setError(upErr.message);
      return;
    }

    setSuccess("Contraseña actualizada. Ya podés iniciar sesión.");
    setTimeout(() => navigate("/login"), 900);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        Cargando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      <div className="max-w-md mx-auto rounded-3xl bg-slate-900/70 border border-white/10 p-6 space-y-4">
        <h1 className="text-xl font-semibold">Restablecer contraseña</h1>

        {error && (
          <div className="rounded-2xl px-4 py-2 text-xs border border-rose-500/40 bg-rose-500/10 text-rose-200">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl px-4 py-2 text-xs border border-emerald-500/40 bg-emerald-500/10 text-emerald-200">
            {success}
          </div>
        )}

        {!success && (
          <form onSubmit={handleUpdate} className="space-y-3">
            <input
              type="password"
              className="input-ritto"
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="password"
              className="input-ritto"
              placeholder="Repetir contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <button type="submit" className="button-ritto w-full">
              Guardar contraseña
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
