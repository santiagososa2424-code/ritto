import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password.trim() || !confirm.trim()) {
      setError("Completá ambos campos.");
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    // 🔥 SUPABASE ACTUALIZA LA PASS DEL USUARIO AUTENTICADO POR LINK
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    if (updateError) {
      setError("El enlace expiró o es inválido. Solicitá uno nuevo.");
      return;
    }

    setSuccess("Contraseña actualizada correctamente.");
  };

  return (
    <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center px-6">

      <div className="w-full max-w-md bg-[#0D1326] border border-[#1C243A]
                      rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.25)]
                      p-10 text-white">

        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <img src="/ritto-logo.svg" alt="Ritto" className="h-14 drop-shadow-xl" />
        </div>

        <h1 className="text-3xl font-semibold text-center mb-2">
          Restablecer contraseña
        </h1>

        <p className="text-center text-blue-100/60 mb-6">
          Elegí una nueva contraseña para tu cuenta.
        </p>

        {/* MENSAJES */}
        {error && (
          <p className="text-red-400 bg-red-400/10 border border-red-400/20
                        px-3 py-2 rounded-lg mb-4 text-center text-sm">
            {error}
          </p>
        )}

        {success && (
          <p className="text-green-400 bg-green-400/10 border border-green-400/20
                        px-3 py-2 rounded-lg mb-4 text-center text-sm">
            {success}
          </p>
        )}

        {/* FORM */}
        <form onSubmit={handleReset} className="space-y-4">

          <div>
            <label className="block mb-1 text-blue-100/80 text-sm">
              Nueva contraseña
            </label>
            <input
              type="password"
              className="w-full bg-[#0D142A] border border-[#1D2844] 
                         text-blue-100 rounded-xl px-3 py-2.5 text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </div>

          <div>
            <label className="block mb-1 text-blue-100/80 text-sm">
              Repetir contraseña
            </label>
            <input
              type="password"
              className="w-full bg-[#0D142A] border border-[#1D2844] 
                         text-blue-100 rounded-xl px-3 py-2.5 text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3
                       rounded-xl font-semibold text-sm transition active:scale-[0.97]"
          >
            Guardar nueva contraseña
          </button>
        </form>

        {/* Volver */}
        <p className="text-center text-blue-100/50 text-sm mt-6">
          <a
            href="/login"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Volver al inicio de sesión
          </a>
        </p>
      </div>
    </div>
  );
}
