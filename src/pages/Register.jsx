import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const CREATOR_CODE = "lafamiliaspinelli";

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    // 1) crear usuario en auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // 2) si se creó bien, guardamos creator_code en la tabla profiles
    const userId = data.user.id;

    await supabase.from("profiles").insert({
      id: userId,
      creator_code: CREATOR_CODE,
    });

    // 3) redirigir al login
    navigate("/");
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Crear cuenta</h1>

      {error && <p className="text-red-500 mb-2">{error}</p>}

      <form onSubmit={handleRegister} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          className="border p-2 rounded"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Contraseña"
          className="border p-2 rounded"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="bg-black text-white p-2 rounded font-semibold"
        >
          Registrarme
        </button>
      </form>

      <p
        className="text-blue-600 mt-3 cursor-pointer"
        onClick={() => navigate("/")}
      >
        ¿Ya tenés cuenta? Iniciar sesión
      </p>
    </div>
  );
}
