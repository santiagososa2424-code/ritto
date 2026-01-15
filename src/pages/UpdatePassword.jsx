import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      setError("");
      setSuccess("");

      try {
        // 1) Si viene con ?code=... (PKCE), intentamos canjearlo por una sesión
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error: codeErr } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (codeErr) {
            console.error(codeErr);
            setError("El link de recuperación no es válido o expiró.");
            setLoading(false);
            return;
          }
        }

        // 2) Confirmamos si ya hay sesión (necesaria para updateUser)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          setError("No hay una sesión válida. Volvé a pedir el link de recuperación.");
          setLoading(false);
          return;
        }

        setLoading(false);
      } catch (e) {
        console.error(e);
        setError("No se pudo iniciar el cambio de contraseña.");
        setLoading(false);
      }
    };

    init();
  }, []);

  const onSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password || !password2) {
      setError("Completá ambos campos.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSaving(true);

    try {
      const { error: upErr } = await supabase.auth.updateUser({
        password,
      });

      if (upErr) {
        console.error(upErr);
        setError("No se pudo actualizar la contraseña. Probá pedir un nuevo link.");
        setSaving(false);
        return;
      }

      setSuccess("Contraseña actualizada. Ya podés iniciar sesión.");

      // Opcional: cerrar sesión recovery y mandar a login
      // await supabase.auth.signOut();

      setSaving(false);

      setTimeout(() => {
        navigate("/login");
      }, 900);
    } catch (e) {
      console.error(e);
      setError("Ocurrió un error guardando la contraseña.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        Cargando…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-xl p-6 text-slate-50">
        <h1 className="text-xl font-semibold mb-2">Actualizar contraseña</h1>
        <p className="text-[12px] text-slate-400 mb-5">
          Elegí una contraseña nueva para tu cuenta.
        </p>

        {error && (
          <div className="rounded-2xl px-4 py-2 text-[12px] border border-rose-500/40 bg-rose-500/10 text-rose-200 mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl px-4 py-2 text-[12px] border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 mb-4">
            {success}
          </div>
        )}

        <form onSubmit={onSave} className="space-y-3">
          <input
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
            placeholder="Nueva contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-400/60"
            placeholder="Repetir contraseña"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-3 rounded-2xl bg-emerald-400 text-slate-950 font-semibold hover:bg-emerald-300 transition disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
