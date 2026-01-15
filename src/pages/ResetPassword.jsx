import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    // Cuando entrás desde el mail, Supabase mete tokens en la URL (hash)
    // Esta llamada intenta “tomar” esa sesión automáticamente.
    const init = async () => {
      try {
        setMsg("");
        // En supabase-js v2, esto suele bastar:
        // - si el link trae tokens en el hash, detectSessionInUrl los procesa
        // - luego la sesión aparece en getSession()
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setReady(true);
          return;
        }

        // Si todavía no hay sesión, igual dejamos la UI lista:
        // a veces tarda un tick en persistir.
        setTimeout(async () => {
          const { data: again } = await supabase.auth.getSession();
          setReady(!!again?.session);
        }, 300);
      } catch (e) {
        setReady(false);
      }
    };

    init();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!password || password.length < 6) {
      setMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== password2) {
      setMsg("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMsg(error.message || "No se pudo actualizar la contraseña.");
        setLoading(false);
        return;
      }

      setMsg("Contraseña actualizada. Ya podés iniciar sesión.");
    } catch (err) {
      setMsg("No se pudo actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.6)] p-6">
        <p className="text-xs text-slate-400 mb-1">Recuperación</p>
        <h1 className="text-xl font-semibold mb-4">Restablecer contraseña</h1>

        {!ready ? (
          <p className="text-sm text-slate-300">
            Si llegaste desde el email, esperá un segundo y recargá esta página.
            Si sigue sin habilitarse, abrí el link del email en el mismo navegador donde usás Ritto.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
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
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />

            {msg && (
              <div className="rounded-2xl px-4 py-2 text-[12px] border border-white/10 bg-white/5 text-slate-200">
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="button-ritto w-full disabled:opacity-60"
            >
              {loading ? "Guardando…" : "Guardar nueva contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
