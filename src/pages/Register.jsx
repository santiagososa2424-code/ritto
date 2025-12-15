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
    if (loading) return;

    if (!name || !lastname || !phone || !businessName || !email || !password) {
      toast.error("Completá todos los campos.");
      return;
    }

    setLoading(true);

    // ---- SLUG SEGURO ----
    let slug =
      businessName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "") ||
      crypto.randomUUID().slice(0, 8);

    const validCreator = creatorCode.trim() === SPECIAL_CODE;

    // ---- CREAR USUARIO ----
    const { data: authData, error: signUpError } =
      await supabase.auth.signUp({
        email,
        password,
      });

    if (signUpError) {
      toast.error(signUpError.message);
      setLoading(false);
      return;
    }

    const user = authData?.user;
    if (!user) {
      toast.error("No se pudo crear el usuario.");
      setLoading(false);
      return;
    }

    // ---- FECHAS ----
    const now = new Date();
    const trialEnds = validCreator
      ? null
      : new Date(now.getTime() + 30 * 86400000).toISOString();

    // ---- CREAR / ACTUALIZAR NEGOCIO (ANTI 409) ----
    const { error: businessError } = await supabase
      .from("businesses")
      .upsert(
        {
          owner_id: user.id,
          name: businessName,
          slug,
          phone,
          is_active: true,
          subscription_status: validCreator ? "lifetime_free" : "trial",
          trial_ends_at: trialEnds,
          whatsapp: phone,
          slot_interval_minutes: 30,
        },
        { onConflict: "owner_id" }
      );

    if (businessError) {
      toast.error("Error creando el negocio.");
      setLoading(false);
      return;
    }

    // ---- METADATA DEL USUARIO ----
    await supabase.auth.updateUser({
      data: {
        name,
        lastname,
        phone,
        business_name: businessName,
        creator_code: validCreator ? SPECIAL_CODE : null,
        lifetime_free: validCreator,
      },
    });

    // ---- LOGIN ----
    await supabase.auth.signInWithPassword({ email, password });

    toast.success(
      validCreator
        ? "Acceso GRATIS para siempre 🎉"
        : "Cuenta creada con éxito 🎉"
    );

    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-black to-blue-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center text-black text-4xl font-extrabold animate-pulse">
            R
          </div>
          <p className="text-white/80 animate-pulse">Creando tu cuenta…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-900 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-2xl font-semibold text-center mb-6">
          Crear cuenta
        </h1>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input className="input-ritto" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input-ritto" placeholder="Apellido" value={lastname} onChange={(e) => setLastname(e.target.value)} />
          </div>

          <input className="input-ritto" placeholder="Nombre del negocio" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          <input className="input-ritto" placeholder="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input className="input-ritto" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input-ritto" placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="input-ritto" placeholder="Código de creador (opcional)" value={creatorCode} onChange={(e) => setCreatorCode(e.target.value)} />

          <button type="submit" className="button-ritto">
            Crear cuenta GRATIS
          </button>
        </form>
      </div>
    </div>
  );
}
