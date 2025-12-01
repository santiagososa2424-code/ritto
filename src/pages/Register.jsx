import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [lastname, setLastname] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [creatorCode, setCreatorCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const CREATOR_MASTER_CODE = "lafamiliaspinelli";

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name || !lastname || !businessName || !phone || !email || !password) {
      setErrorMsg("Completá todos los campos.");
      return;
    }

    setIsLoading(true);

    const isLifetime =
      creatorCode.trim().toLowerCase() === CREATOR_MASTER_CODE.toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // metadata stored in auth.users
          name,
          lastname,
          phone,
          businessName,
          creator_code: creatorCode,
          lifetime_plan: isLifetime, // 🔥 acceso gratis para siempre
        },
      },
    });

    if (error) {
      console.error(error);
      setErrorMsg(error.message || "No se pudo crear la cuenta.");
      setIsLoading(false);
      return;
    }

    navigate("/login");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center px-6">
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.25)] bg-[#0D1326] flex flex-col md:flex-row border border-[#1C243A]">

        {/* BRANDING IGUAL AL LOGIN */}
        <div className="md:w-1/2 p-10 flex flex-col justify-between bg-gradient-to-b from-[#0D142A] to-[#0A0F1F] text-white">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-[#0A0F1F] text-2xl font-bold shadow-inner">
                📅
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Ritto</h1>
            </div>

            <p className="text-sm text-blue-100/80 leading-relaxed">
              Probá Ritto 30 días gratis y empezá a automatizar tu negocio desde hoy.
            </p>

            <ul className="mt-6 space-y-3 text-blue-100/70 text-sm">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-green-400" />
                Link público para reservas 24/7.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-green-400" />
                Notificaciones automáticas y panel premium.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-green-400" />
                Diseño profesional y soporte en español.
              </li>
            </ul>
          </div>

          <div className="mt-10 text-xs text-blue-100/40">
            <p>Soporte: 093 403 706</p>
            <p>Hecho en Uruguay 🇺🇾</p>
          </div>
        </div>

        {/* FORM */}
        <div className="md:w-1/2 p-10 bg-[#0A0F1F] text-white flex flex-col justify-center">

          <h2 className="text-2xl font-semibold mb-2">Crear cuenta</h2>
          <p className="text-sm text-blue-100/60 mb-6">
            Comenzá tu prueba gratuita.
          </p>

          {errorMsg && (
            <p className="text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-lg mb-4">
              {errorMsg}
            </p>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-4">

            {/* Nombre + Apellido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1 text-blue-100/80">Nombre</label>
                <input
                  type="text"
                  className="w-full bg-[#0D142A] border border-[#1D2844] rounded-xl px-3 py-2.5 text-sm text-blue-100"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Santiago"
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-blue-100/80">Apellido</label>
                <input
                  type="text"
                  className="w-full bg-[#0D142A] border border-[#1D2844] rounded-xl px-3 py-2.5 text-sm text-blue-100"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  placeholder="Sosa"
                />
              </div>
            </div>

            {/* Nombre del negocio */}
            <div>
              <label className="block text-sm mb-1 text-blue-100/80">
                Nombre del negocio
              </label>
              <input
                type="text"
                className="w-full bg-[#0D142A] border border-[#1D2844] rounded-xl px-3 py-2.5 text-sm text-blue-100"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Mi Barbería"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm mb-1 text-blue-100/80">Teléfono</label>
              <input
                type="tel"
                className="w-full bg-[#0D142A] border border-[#1D2844] rounded-xl px-3 py-2.5 text-sm text-blue-100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09X XXX XXX"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm mb-1 text-blue-100/80">Email</label>
              <input
                type="email"
                className="w-full bg-[#0D142A] border border-[#1D2844] rounded-xl px-3 py-2.5 text-sm text-blue-100"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@mail.com"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm mb-1 text-blue-100/80">Contraseña</label>
              <input
                type="password"
                className="w-full bg-[#0D142A] border border-[#1D2844] rounded-xl px-3 py-2.5 text-sm text-blue-100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {/* Código de creador */}
            <div>
              <label className="block text-sm mb-1 text-blue-100/80">
                Código de creador (opcional)
              </label>
              <input
                type="text"
                className="w-full bg-[#0D142A] border border-[#1D2844] rounded-xl px-3 py-2.5 text-sm text-blue-100"
                value={creatorCode}
                onChange={(e) => setCreatorCode(e.target.value)}
                placeholder="Ingresá un código si tenés uno"
              />
            </div>

            {/* BOTÓN */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold py-3 rounded-2xl text-sm transition disabled:opacity-50"
            >
              {isLoading ? "Creando cuenta..." : "Crear cuenta GRATIS"}
            </button>
          </form>

          <div className="mt-5 text-sm">
            <span className="text-blue-100/60 mr-1">¿Ya tenés una cuenta?</span>
            <button
              className="text-blue-400 hover:text-blue-300 transition"
              onClick={() => navigate("/login")}
            >
              Iniciar sesión
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
