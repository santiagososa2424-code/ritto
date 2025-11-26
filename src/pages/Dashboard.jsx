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

  // ---------------------------------------------------------
  // CARGAR NEGOCIO DEL USUARIO + ESTADÍSTICAS
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // ESTADÍSTICAS DEL NEGOCIO
  // ---------------------------------------------------------
  const fetchStats = async (businessId) => {
    try {
      setLoadingStats(true);

      const now = new Date();

      // RANGOS DEL MES
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const startOfMonthStr = startOfMonth.toISOString().slice(0, 10);
      const startOfNextMonthStr = startOfNextMonth.toISOString().slice(0, 10);

      // MES ANTERIOR
      const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const startPrevStr = startPrev.toISOString().slice(0, 10);
      const startThisMonthStr = startOfMonth.toISOString().slice(0, 10);

      // HOY
      const todayStr = now.toISOString().slice(0, 10);

      // 30 días para top servicio
      const last30 = new Date();
      last30.setDate(last30.getDate() - 30);
      const last30Str = last30.toISOString();

      //------------------------------------------
      // MES ACTUAL
      //------------------------------------------
      const { data: bookingsMonth } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .gte("date", startOfMonthStr)
        .lt("date", startOfNextMonthStr);

      //------------------------------------------
      // MES ANTERIOR
      //------------------------------------------
      const { data: bookingsPrevMonth } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .gte("date", startPrevStr)
        .lt("date", startThisMonthStr);

      const monthTotal = bookingsMonth?.length || 0;
      const monthPrevTotal = bookingsPrevMonth?.length || 0;
      const monthDiff = monthTotal - monthPrevTotal;

      let monthTrend = "igual";
      if (monthTotal > monthPrevTotal) monthTrend = "subiendo";
      if (monthTotal < monthPrevTotal) monthTrend = "bajando";

      //------------------------------------------
      // TOP SERVICIO (30 días)
      //------------------------------------------
      const { data: bookingsLast30 } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .gte("created_at", last30Str);

      let topServiceName = null;
      let topServiceCount = 0;
      let topServicePercent = 0;

      if (bookingsLast30?.length > 0) {
        const countMap = {};

        bookingsLast30.forEach((b) => {
          const k = b.service_name || "Sin nombre";
          countMap[k] = (countMap[k] || 0) + 1;
        });

        const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]);

        topServiceName = sorted[0][0];
        topServiceCount = sorted[0][1];
        topServicePercent = Math.round((sorted[0][1] / bookingsLast30.length) * 100);
      }

      //------------------------------------------
      // RESERVAS HOY
      //------------------------------------------
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
    } catch (err) {
      console.error("Error cargando estadísticas", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // ---------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // ---------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-lg">Cargando...</p>
      </div>
    );

  // ---------------------------------------------------------
  // UI PRINCIPAL
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* SIDEBAR */}
      <aside className="w-64 bg-blue-700 text-white flex flex-col p-6">
        <div className="mb-10 flex items-center gap-2">
          <img src="/ritto-logo.svg" className="h-10" alt="Ritto" />
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

          <button className="text-left hover:text-white" onClick={() => navigate("/bookings")}>
            Ver todas las reservas
          </button>

          <button
            className="text-left hover:text-white"
            onClick={() => setShowTodayList(!showTodayList)}
          >
            Turnos de hoy
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
              {/* Reservas este mes */}
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Reservas este mes</p>
                <p className="text-2xl font-bold text-blue-700">{stats.monthTotal}</p>

                <p className="text-xs mt-1 text-gray-600">
                  Mes anterior: {stats.monthPrevTotal}{" "}
                  {stats.monthTrend === "subiendo" && (
                    <span className="text-green-600 font-semibold">↑ +{stats.monthDiff}</span>
                  )}
                  {stats.monthTrend === "bajando" && (
                    <span className="text-red-600 font-semibold">↓ {stats.monthDiff}</span>
                  )}
                </p>
              </div>

              {/* Servicio más reservado */}
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Servicio más reservado (30 días)</p>

                {stats.topServiceName ? (
                  <>
                    <p className="text-sm font-semibold text-slate-800">{stats.topServiceName}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {stats.topServiceCount} reservas ({stats.topServicePercent}%)
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">Aún no hay reservas suficientes.</p>
                )}
              </div>

              {/* Reservas hoy */}
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Reservas hoy</p>
                <p className="text-2xl font-bold text-blue-700">{stats.todayTotal}</p>
                <p className="text-xs text-gray-600 mt-1">Turnos agendados para hoy.</p>
              </div>

              {/* Tip */}
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Tip del día</p>
                <p className="text-sm text-gray-600">
                  Revisá los turnos diarios para evitar solapamientos y mejorar tu organización.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* LISTA DE TURNOS DE HOY */}
        {showTodayList && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">Turnos de hoy</h2>

            {stats.todayBookings.length === 0 ? (
              <p className="text-sm text-gray-500">Hoy no tenés reservas.</p>
            ) : (
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <ul className="divide-y">
                  {stats.todayBookings.map((b) => (
                    <li key={b.id} className="py-2 flex justify-between text-sm">
                      <div>
                        <p className="font-semibold">
                          {b.hour?.slice(0, 5)} — {b.service_name}
                        </p>
                        <p className="text-gray-600 text-xs">
                          {b.customer_name} ({b.customer_email})
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">{b.status || "confirmado"}</span>
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
