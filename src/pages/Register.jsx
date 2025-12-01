import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Register() {
  const [name, setName] = useState("");
  const [lastname, setLastname] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creatorCode, setCreatorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const navigate = useNavigate();
  const SPECIAL_CODE = "lafamiliaspinelli";

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name || !lastname || !phone || !businessName || !email || !password) {
      toast.error("Completá todos los campos.");
      return;
    }

    setChecking(true);

    // 1️⃣ VALIDAR SI EL NEGOCIO YA EXISTE
    const { data: existingBiz, error: bizCheckError } = await supabase
      .from("businesses")
      .select("id")
      .eq("name", businessName.trim());

    if (bizCheckError) {
      toast.error("Hubo un problema verificando el negocio.");
      setChecking(false);
      return;
    }

    if (existingBiz.length > 0) {
      toast.error("Ya existe un negocio con ese nombre.");
      setChecking(false);
      return;
    }

    setChecking(false);
    setLoading(true);

    // 2️⃣ CREAR USUARIO
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          lastname,
          phone,
          businessName,
          creator_code: creatorCode || null,
          lifetime_free: creatorCode === SPECIAL_CODE,
        },
      },
    });

    if (signUpError) {
      toast.error(signUpError.message || "No se pudo crear la cuenta.");
      setLoading(false);
      return;
    }

    const user = data?.user;
    if (!user) {
      toast.error("Error creando tu cuenta.");
      setLoading(false);
      return;
    }

    // 3️⃣ CREAR NEGOCIO
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const plan = creatorCode === SPECIAL_CODE ? "lifetime_free" : "trial";

    const { error: businessError } = await supabase
      .from("businesses")
      .insert([
        {
          id: crypto.randomUUID(),
          owner_id: user.id,
          name: businessName,
          phone,
          is_active: true,
          plan,
          trial_starts_at: plan === "trial" ? now.toISOString() : null,
          trial_ends_at: plan === "trial" ? trialEnds.toISOString() : null,
        },
      ]);

    if (businessError) {
      toast.error("No se pudo crear el negocio.");
      setLoading(false);
      return;
    }

    toast.success("Cuenta creada con éxito 🎉");
    setLoading(false);
    navigate("/dashboard");
  };

  // ⭐ LOADER ANIMADO RITTO (APPLE STYLE)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-900">
        <div className="flex flex-col items-center gap-4 animate-fadeIn">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-black text-4xl font-extrabold animate-pulse shadow-xl">
            R
          </div>
          <p className="text-white/80 animate-pulse">Creando tu cuenta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-900 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl animate-fadeIn">

        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-black text-3xl font-bold shadow-inner animate-popIn">
            R
          </div>
          <h1 className="text-2xl font-semibold mt-3 tracking-wide">
            Crear cuenta
          </h1>
          <p className="text-slate-300 text-sm mt-1">
            Comenzá tu prueba gratuita de 30 días
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">

          {/* Nombre y apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-200">Nombre</label>
              <input
                type="text"
                className="input-ritto"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Santiago"
              />
            </div>

            <div>
              <label className="text-sm text-slate-200">Apellido</label>
              <input
                type="text"
                className="input-ritto"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
                placeholder="Sosa"
              />
            </div>
          </div>

          {/* Negocio */}
          <div>
            <label className="text-sm text-slate-200">Nombre del negocio</label>
            <input
              type="text"
              className="input-ritto"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Barbería Ritto"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="text-sm text-slate-200">Teléfono</label>
            <input
              type="tel"
              className="input-ritto"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09X XXX XXX"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm text-slate-200">Email</label>
            <input
              type="email"
              className="input-ritto"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@mail.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-slate-200">Contraseña</label>
            <input
              type="password"
              className="input-ritto"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {/* Creator Code */}
          <div>
            <label className="text-sm text-slate-200">Código de creador (opcional)</label>
            <input
              type="text"
              className="input-ritto"
              value={creatorCode}
              onChange={(e) => setCreatorCode(e.target.value)}
              placeholder="lafamiliaspinelli"
            />
          </div>

          <button
            type="submit"
            className="button-ritto"
          >
            Crear cuenta GRATIS
          </button>
        </form>

      </div>
    </div>
  );
}

/* TAILWIND CLASSES PERSONALIZADAS: AGREGA ESTO EN TU CSS GLOBAL

.input-ritto {
  @apply w-full bg-white/5 border border-white/20 text-white rounded-2xl p-3 text-sm 
  focus:ring-2 focus:ring-blue-400 transition-all duration-300
  focus:scale-[1.02] hover:scale-[1.01];
}

.button-ritto {
  @apply w-full mt-2 bg-gradient-to-r from-blue-400 to-cyan-400 text-black font-semibold py-3 
  rounded-2xl text-sm hover:opacity-90 transition-all duration-300 shadow-lg hover:scale-[1.02];
}

.animate-fadeIn {
  animation: fadeIn 0.6s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-popIn {
  animation: popIn 0.5s ease-out;
}

@keyframes popIn {
  0% { transform: scale(0.6); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

*/

