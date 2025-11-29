import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [lastname, setLastname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const CREATOR_CODE = "lafamiliaspinelli";

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name || !lastname || !phone || !email || !password) {
      setErrorMsg("Completá todos los campos.");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase.auth.signUp({
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

    if (error) {
      console.error(error);
      setErrorMsg(error.message || "No se pudo crear la cuenta.");
      setIsLoading(false);
      return;
    }

    // Si todo bien → mandamos al login o dashboard
    // (podés cambiar a "/dashboard" si querés entrar directo)
    navigate("/login");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0A0F1F] flex items-center justify-center px-6">
      {/* CONTENEDOR PRINCIPAL */}
      <div className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.25)] bg-[#0D1326] flex flex-col md:flex-row border border-[#1C243A]">
        {/* BRANDING (igual que login) */}
        <div className="md:w-1/2 p-10 flex flex-col justify-between bg-gradient-to-b from-[#0D142A] to-[#0A0F1F] text-white">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <img src="/ritto-logo.svg" className="h-12 drop-shadow-xl" />
              <h1 className="text-3xl font-semibold tracking-tight">Ritto</h1>
            </div>

            <p className="text-sm text-blue-100/80 leading-relaxed">
              Probá Ritto 30 días sin compromiso. Configurá tu agenda, servicios
              y empezá a recibir turnos en minutos.
            </p>

            <ul className="mt-6 space-y-3 text-blue-100/70 text-sm">
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-green-400" />
                Link público para que tus clientes reserven 24/7.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-green-400" />
                Notificaciones por email con los datos del turno.
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-green-400" />
                Diseño premium y panel súper intuitivo.
              </li>
            </ul>
          </div>

          <div className="mt-10 text-xs text-blue-100/40">
            <p>Soporte: 093 403 706</p>
            <p>Hecho en Uruguay 🇺🇾</p>
          </div>
        </div>

        {/* FORMULARIO REGISTRO */}
        <div className="md:w-1/2 p-10 bg-[#0A0F1F] text-white flex flex-col justify-center">
          <h2 className="text-2xl font-semibold mb-2">Crear cuenta</h2>
          <p className="text-sm text-blue-100/60 mb-6">
            Empezá tu prueba gratuita de 30 días.
          </p>

          {errorMsg && (
            <p className="text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-lg mb-4">
              {errorMsg}
            </p>
          )}

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            {/* Nombre */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1 text-blue-100/80">
                  Nombre
                </label>
                <input
                  type="text"
                  className="w-full bg-[#0D142A] border border-[#1D2844] rounded-xl px-3 py-2.5 text-sm text-blue-100 focus:border-blue-500 focus:ring-blue-500 focus:ring-2 outline-none transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Santiago"
                />
              </div>

              <div>
                <label className="block text-sm mb-1 text-blue-100/80">
                  Apellido
                </label>
                <input
                  type="text"
                  className="w-full bg-[#0D142A] border border-[#1D2844] rounded-xl px-3 py-2.5 text-sm text-blue-100 focus:border-blue-500 focus:ring-blue-500 focus:ring-2 outline-none transition-all"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  placeholder="Sosa"
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm mb-1 text-blue-100/80">
                Teléfono
              </label>
              <input
                type="tel"
                className="w-full bg-[#0D142A] border border-[#1D2844] rounded-xl px-3 py-2.5 text-sm text-blue-100 focus:border-blue-500 focus:ring-blue-500 focus:ring-2 outline-none transition-all"
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
                className="w-full bg-[#0D142A] border border-[#1D2844] rounded-xl px-3 py-2.5 text-sm text-blue-100 focus:border-blue-500 focus:ring-blue-500 focus:ring-2 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@mail.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm mb-1 text-blue-100/80">
                Contraseña
              </label>
              <input
                type="password"
                className="w-full bg-[#0D142A] border border-[#1D2844] rounded-xl px-3 py-2.5 text-sm text-blue-100 focus:border-blue-500 focus:ring-blue-500 focus:ring-2 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {/* BOTÓN */}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 rounded-xl shadow-lg transition-all active:scale-[0.97] disabled:opacity-60"
            >
              {isLoading ? "Creando cuenta..." : "Crear cuenta GRATIS"}
            </button>
          </form>

          {/* LINK A LOGIN */}
          <div className="mt-5 text-sm">
            <span className="text-blue-100/60 mr-1">
              ¿Ya tenés una cuenta?
            </span>
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
