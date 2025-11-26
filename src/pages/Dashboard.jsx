import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBusiness = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .single();

      if (!data) {
        navigate("/setup");
        return;
      }

      setBusiness(data);
      setLoading(false);
    };

    fetchBusiness();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-lg">Cargando...</p>
      </div>
    );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* SIDEBAR */}
      <aside className="w-64 bg-blue-700 text-white flex flex-col p-6">
        <div className="mb-10 flex items-center gap-2">
          <img src="/ritto-logo.svg" className="h-10" />
        </div>

        <nav className="flex flex-col gap-4 text-blue-100">
          <button className="text-left hover:text-white" onClick={() => navigate("/dashboard")}>
            Inicio
          </button>

          <button className="text-left hover:text-white" onClick={() => navigate("/services")}>
            Servicios
          </button>

          <button className="text-left hover:text-white" onClick={() => navigate("/schedule")}>
            Horarios
          </button>

          <button className="text-left hover:text-white" onClick={() => navigate("/schedule-blocks")}>
            Bloquear días
          </button>

          <button className="text-left hover:text-white" onClick={() => navigate("/setup")}>
            Configuración del negocio
          </button>

          <button className="text-left hover:text-white" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </nav>

        <div className="mt-auto text-xs text-blue-200 pt-6">
          <p>Soporte: 093 403 706</p>
          <p>Hecho en Uruguay 🇺🇾</p>
        </div>
      </aside>

      {/* CONTENIDO */}
      <main className="flex-1 p-10">
        <h1 className="text-3xl font-bold text-blue-800 mb-3">
          Dashboard de {business.name}
        </h1>

        <p className="text-gray-600 mb-6">
          Link público:{" "}
          <span className="font-semibold text-blue-700">
            ritto.lat/{business.slug}
          </span>
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Servicios */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-blue-700 mb-2">Servicios</h2>
            <p className="text-gray-600 text-sm mb-4">
              Añadí o editá los servicios que ofrecés.
            </p>
            <button className="text-blue-600 font-semibold hover:underline"
              onClick={() => navigate("/services")}>
              Ir a Servicios →
            </button>
          </div>

          {/* Horarios */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-blue-700 mb-2">Horarios</h2>
            <p className="text-gray-600 text-sm mb-4">
              Configurá tus horarios disponibles.
            </p>
            <button className="text-blue-600 font-semibold hover:underline"
              onClick={() => navigate("/schedule")}>
              Ir a Horarios →
            </button>
          </div>

          {/* Bloqueo de días */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-blue-700 mb-2">Bloquear días</h2>
            <p className="text-gray-600 text-sm mb-4">
              Licencias, vacaciones y fechas que no querés recibir reservas.
            </p>
            <button className="text-blue-600 font-semibold hover:underline"
              onClick={() => navigate("/schedule-blocks")}>
              Ir a bloqueos →
            </button>
          </div>

          {/* Configuración */}
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-blue-700 mb-2">Configuración</h2>
            <p className="text-gray-600 text-sm mb-4">
              Cambiá el nombre del negocio, ubicación y políticas.
            </p>
            <button className="text-blue-600 font-semibold hover:underline"
              onClick={() => navigate("/setup")}>
              Ir a Configuración →
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
