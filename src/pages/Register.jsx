import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [lastname, setLastname] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creatorCode, setCreatorCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const SPECIAL_CODE = "lafamiliaspinelli";

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!name || !lastname || !phone || !businessName || !email || !password) {
      setErrorMsg("Completá todos los campos.");
      return;
    }

    setLoading(true);

    // SIGNUP EN SUPABASE AUTH
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          lastname,
          phone,
          businessName,
          creator_code: creatorCode || null,
          lifetime_free: creatorCode === SPECIAL_CODE ? true : false,
        },
      },
    });

    if (error) {
      setErrorMsg(error.message || "No se pudo crear la cuenta.");
      setLoading(false);
      return;
    }

    const user = data.user;
    if (!user) {
      setErrorMsg("Error inesperado creando usuario.");
      setLoading(false);
      return;
    }

    // INSERTAR NEGOCIO EN LA TABLA BUSINESSES
    const { error: bizError } = await supabase
      .from("businesses")
      .insert([
        {
          id: crypto.randomUUID(),
          owner_id: user.id,
          name: businessName,
          phone,
          is_active: true,
          plan: creatorCode === SPECIAL_CODE ? "lifetime_free" : "trial",
          trial_starts_at: creatorCode === SPECIAL_CODE ? null : new Date().toISOString(),
          trial_ends_at:
            creatorCode === SPECIAL_CODE
              ? null
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);

    if (bizError) {
      console.error(bizError);
      setErrorMsg("No se pudo crear el negocio.");
      setLoading(false);
      return;
    }

    setLoading(false);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900/70 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-[0_18px_60px_rgba(0,0,0,0.6)]">

        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center text-slate-950 text-2xl font-bold shadow-inner">
            R
          </div>
          <h1 className="text-xl font-semibold mt-3">Crear cuenta</h1>
          <p className="text-slate-400 text-sm mt-1">Comenzá tu prueba gratuita</p>
        </div>

        {errorMsg && (
          <p className="text-red-400 bg-red-400/10 border border-red-400/20 px-3 py-2 rounded-lg text-sm mb-4 text-center">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleRegister} className="space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-300">Nombre</label>
              <input
                type="text"
                className="w-full bg-slate-900/50 border border-white/10 text-white rounded-2xl p-3 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Santiago"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Apellido</label>
              <input
                type="text"
                className="w-full bg-slate-900/50 border border-white/10 text-white rounded-2xl p-3 text-sm"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                placeholder="Sosa"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-300">Nombre del negocio</label>
            <input
              type="text"
              className="w-full bg-slate-900/50 border border-white/10 text-white rounded-2xl p-3 text-sm"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Barbería Ritto"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Teléfono</label>
            <input
              type="tel"
              className="w-full bg-slate-900/50 border border-white/10 text-white rounded-2xl p-3 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09X XXX XXX"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Email</label>
            <input
              type="email"
              className="w-full bg-slate-900/50 border border-white/10 text-white rounded-2xl p-3 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@mail.com"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Contraseña</label>
            <input
              type="password"
              className="w-full bg-slate-900/50 border border-white/10 text-white rounded-2xl p-3 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Código de creador (opcional)</label>
            <input
              type="text"
              className="w-full bg-slate-900/50 border border-white/10 text-white rounded-2xl p-3 text-sm"
              value={creatorCode}
              onChange={(e) => setCreatorCode(e.target.value)}
              placeholder="lafamiliaspinelli"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-emerald-400 text-slate-950 font-semibold py-3 rounded-2xl text-sm hover:bg-emerald-300 transition disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta GRATIS"}
          </button>
        </form>

      </div>
    </div>
  );
}
