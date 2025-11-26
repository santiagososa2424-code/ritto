import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({
    monthTotal: 0,
    monthPrevTotal: 0,
    monthDiff: 0,
    monthTrend: "igual",
    topServiceName: null,
    topServiceCount: 0,
    topServicePercent: 0,
    todayTotal: 0,
    todayBookings: [],
  });

  const [showTodayList, setShowTodayList] = useState(false);

  const navigate = useNavigate();

  // =====================================================
  // CARGAR NEGOCIO + ESTADÍSTICAS
  // =====================================================
  useEffect(() => {
    const fetchBusinessAndStats = async () => {
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

      await fetchStats(data.id);
    };

    fetchBusinessAndStats();
  }, []);

  // =====================================================
  // ESTADÍSTICAS DEL MES / TOP SERVICIO / HOY
  // =====================================================
  const fetchStats = async (businessId) => {
    try {
      setLoadingStats(true);

      const now = new Date();

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      );

      const startOfMonthStr = startOfMonth.toISOString().slice(0, 10);
      const startOfNextMonthStr = startOfNextMonth.toISOString().slice(0, 10);

      // Mes anterior
      const startOfPrevMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );
      const startOfPrevMonthStr = startOfPrevMonth.toISOString().slice(0, 10);
      const startOfThisMonthStr = startOfMonth.toISOString().slice(0, 10);

      const todayStr = now.toISOString().slice(0, 10);

      // Últimos 30 días
      const last30 = new Date();
      last30.setDate(last30.getDate() - 30);
      const last30Str = last30.toISOString();

      // Mes actual
      const { data: bookingsMonth } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .gte("date", startOfMonthStr)
        .lt("date", startOfNextMonthStr);

      const { data: bookingsPrevMonth } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .gte("date", startOfPrevMonthStr)
        .lt("date", startOfThisMonthStr);

      const monthTotal = bookingsMonth?.length || 0;
      const monthPrevTotal = bookingsPrevMonth?.length || 0;

      const monthDiff = monthTotal - monthPrevTotal;
      let monthTrend = "igual";
      if (monthTotal > monthPrevTotal) monthTrend = "subiendo";
      if (monthTotal < monthPrevTotal) monthTrend = "bajando";

      // TOP Servicio últimos 30 días
      const { data: bookingsLast30 } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .gte("created_at", last30Str);

      let topServiceName = null;
      let topServiceCount = 0;
      let topServicePercent = 0;

      if (bookingsLast30?.length > 0) {
        const counter = {};
        bookingsLast30.forEach((b) => {
          const key = b.service_name || "Sin nombre";
          counter[key] = (counter[key] || 0) + 1;
        });

        const sorted = Object.entries(counter).sort((a, b) => b[1] - a[1]);
        const [name, count] = sorted[0];

        topServiceName = name;
        topServiceCount = count;
        topServicePercent = Math.round(
          (count / bookingsLast30.length) * 100
        );
      }

      // Turnos HOY
      const { data: bookingsToday } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .eq("date", todayStr)
        .order("hour", { ascending: true });

      const todayTotal = bookingsToday?.length || 0;

      setStats({
        monthTotal,
        monthPrevTotal,
        monthDiff,
        monthTrend,
        topServiceName,
        topServiceCount,
        topServicePercent,
        todayTotal,
        todayBookings: bookingsToday || [],
      });
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // =====================================================
  // LOADING
  // =====================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-lg">Cargando...</p>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* SIDEBAR */}
      <aside className="w-64 bg-blue-700 text-white flex flex-col p-6">
        <div className="mb-10 flex items-center gap-2">
          <img src="/ritto-logo.svg" className="h-10" alt="Ritto" />
        </div>

        <nav className="flex flex-col gap-4 text-blue-100">
          <button onClick={() => navigate("/dashboard")} className="text-left hover:text-white">
            Inicio
          </button>

          <button onClick={() => navigate("/services")} className="text-left hover:text-white">
            Servicios
          </button>

          <button onClick={() => navigate("/schedule")} className="text-left hover:text-white">
            Horarios
          </button>

          <button onClick={() => navigate("/schedule-blocks")} className="text-left hover:text-white">
            Bloquear días
          </button>

          <button onClick={() => setShowTodayList(!showTodayList)} className="text-left hover:text-white">
            Turnos de hoy
          </button>

          <button onClick={() => navigate("/setup")} className="text-left hover:text-white">
            Configuración del negocio
          </button>

          <button onClick={handleLogout} className="text-left hover:text-white">
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
        <h1 className="text-3xl font-bold text-blue-800 mb-1">
          Dashboard de {business.name}
        </h1>

        <p className="text-gray-600 mb-6">
          Link público:{" "}
          <span className="font-semibold text-blue-700">
            ritto.lat/{business.slug}
          </span>
        </p>

        {/* ESTADÍSTICAS */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">
            Estadísticas rápidas
          </h2>

          {loadingStats ? (
            <p className="text-gray-500 text-sm">Cargando estadísticas...</p>
          ) : (
            <div className="grid md:grid-cols-4 gap-4">
              {/* Mes actual */}
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">
                  Reservas este mes
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  {stats.monthTotal}
                </p>

                <p className="text-xs mt-1 text-gray-600">
                  Mes anterior: {stats.monthPrevTotal}{" "}
                  {stats.monthTrend === "subiendo" && (
                    <span className="text-green-600 font-semibold">
                      ↑ +{stats.monthDiff}
                    </span>
                  )}
                  {stats.monthTrend === "bajando" && (
                    <span className="text-red-600 font-semibold">
                      ↓ {stats.monthDiff}
                    </span>
                  )}
                </p>
              </div>

              {/* TOP servicio */}
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">
                  Servicio más reservado (30 días)
                </p>

                {stats.topServiceName ? (
                  <>
                    <p className="text-sm font-semibold">
                      {stats.topServiceName}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {stats.topServiceCount} reservas (
                      {stats.topServicePercent}%)
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    No hay suficientes datos aún.
                  </p>
                )}
              </div>

              {/* Turnos HOY */}
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">
                  Reservas hoy
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  {stats.todayTotal}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Turnos agendados para hoy.
                </p>
              </div>

              {/* Tip */}
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Tip del día</p>
                <p className="text-sm text-gray-600">
                  Controlá tus horarios según tu demanda real.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* LISTA DE TURNOS HOY */}
        {showTodayList && !loadingStats && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold mb-3">
              Turnos de hoy
            </h2>

            {stats.todayBookings.length === 0 ? (
              <p className="text-sm text-gray-500">
                Hoy no tenés reservas todavía.
              </p>
            ) : (
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <ul className="divide-y">
                  {stats.todayBookings.map((b) => (
                    <li
                      key={b.id}
                      className="py-3 flex justify-between text-sm"
                    >
                      <div>
                        <p className="font-semibold text-blue-700">
                          {b.hour.slice(0, 5)} — {b.service_name}
                        </p>
                        <p className="text-gray-600 text-xs">
                          {b.customer_name} ({b.customer_email})
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {b.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
