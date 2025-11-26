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

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center px-6">

      {/* CONTENEDOR PRINCIPAL */}
      <div className="w-full max-w-xl bg-[#0D1326] border border-[#1C243A]
                      rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.25)]
                      p-10 text-white">

        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <img src="/ritto-logo.svg" className="h-14 drop-shadow-xl" />
        </div>

        <h1 className="text-3xl font-semibold text-center mb-2">
          Crear cuenta
        </h1>

        <p className="text-center text-blue-100/60 mb-6">
          Empezá gratis — 30 días sin tarjeta
        </p>

        {error && (
          <p className="text-red-400 bg-red-400/10 border border-red-400/20
                        px-3 py-2 rounded-lg mb-4 text-center text-sm">
            {error}
          </p>
        )}

        {/* FORM */}
        <form onSubmit={handleRegister} className="space-y-4">

          {/* NOMBRE */}
          <div>
            <label className="block mb-1 text-blue-100/80 text-sm">Nombre</label>
            <input
              type="text"
              className="w-full bg-[#0D142A] border border-[#1D2844] 
                         text-blue-100 rounded-xl px-3 py-2.5 text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan"
            />
          </div>

          {/* APELLIDO */}
          <div>
            <label className="block mb-1 text-blue-100/80 text-sm">Apellido</label>
            <input
              type="text"
              className="w-full bg-[#0D142A] border border-[#1D2844] 
                         text-blue-100 rounded-xl px-3 py-2.5 text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              placeholder="Pérez"
            />
          </div>

          {/* TELEFONO */}
          <div>
            <label className="block mb-1 text-blue-100/80 text-sm">Teléfono</label>
            <input
              type="text"
              className="w-full bg-[#0D142A] border border-[#1D2844] 
                         text-blue-100 rounded-xl px-3 py-2.5 text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09X XXX XXX"
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="block mb-1 text-blue-100/80 text-sm">Email</label>
            <input
              type="email"
              className="w-full bg-[#0D142A] border border-[#1D2844] 
                         text-blue-100 rounded-xl px-3 py-2.5 text-sm
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@email.com"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block mb-1 text-blue-100/80 text-sm">Contraseña</label>
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

          {/* BOTON */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3
                       rounded-xl font-semibold text-sm transition active:scale-[0.97]"
          >
            Crear cuenta
          </button>
        </form>

        {/* LINK LOGIN */}
        <p className="text-center text-blue-100/60 text-sm mt-6">
          ¿Ya tenés cuenta?{" "}
          <button
            className="text-blue-400 hover:text-blue-300 underline"
            onClick={() => navigate("/login")}
          >
            Iniciar sesión
          </button>
        </p>
      </div>
    </div>
  );
}
