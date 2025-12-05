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

    // ---- SLUG limpio ----
    let slug =
      businessName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "") || crypto.randomUUID().slice(0, 8);

    setChecking(true);

    // ---- Check slug ----
    const { data: existingBiz, error: checkError } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", slug);

    if (checkError) {
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

    // ---- Código creador ----
    const validCreator = creatorCode.trim() === SPECIAL_CODE;

    // ---- Crear usuario ----
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          lastname,
          phone,
          business_name: businessName,
          creator_code: validCreator ? SPECIAL_CODE : null,
          lifetime_free: validCreator,
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

    // ---- Trial solo si NO es lifetime ----
    const now = new Date();
    const trialEnds = validCreator
      ? null
      : new Date(now.getTime() + 30 * 86400000).toISOString();

    // ---- Crear negocio CON TU TABLA REAL ----
    const { error: businessError } = await supabase.from("businesses").insert([
      {
        owner_id: user.id,
        name: businessName,
        slug,
        phone,
        is_active: true,

        // Tu tabla usa subscription_status en vez de plan
        subscription_status: validCreator ? "lifetime_free" : "trial",

        // Tu tabla solo tiene trial_ends_at (NO trial_starts_at)
        trial_ends_at: trialEnds,

        // Campos que tu tabla sí tiene
        whatsapp: phone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        slot_interval_minutes: 30,
      },
    ]);

    if (businessError) {
      toast.error("No se pudo crear el negocio.");
      setLoading(false);
      return;
    }

    // ---- Login automático ----
    await supabase.auth.signInWithPassword({ email, password });

    toast.success(
      validCreator
        ? "Acceso GRATIS para siempre activado 🎉"
        : "Cuenta creada con éxito 🎉"
    );

    setLoading(false);
    navigate("/dashboard");
  };

  // ---------- Loader ----------
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

  // ---------- UI ----------
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-200">Nombre</label>
              <input
                type="text"
                className="input-ritto"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-slate-200">Apellido</label>
              <input
                type="text"
                className="input-ritto"
                value={lastname}
                onChange={(e) => setLastname(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-200">Nombre del negocio</label>
            <input
              type="text"
              className="input-ritto"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-slate-200">Teléfono</label>
            <input
              type="tel"
              className="input-ritto"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-slate-200">Email</label>
            <input
              type="email"
              className="input-ritto"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-slate-200">Contraseña</label>
            <input
              type="password"
              className="input-ritto"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-slate-200">
              Código de creador (opcional)
            </label>
            <input
              type="text"
              className="input-ritto"
              value={creatorCode}
              onChange={(e) => setCreatorCode(e.target.value)}
              placeholder="Ingresá un código si tenés uno"
            />
          </div>

          <button type="submit" className="button-ritto">
            Crear cuenta GRATIS
          </button>
        </form>
      </div>
    </div>
  );
}
