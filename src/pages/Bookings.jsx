import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Bookings() {
  const [businessId, setBusinessId] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (!business) {
      navigate("/setup");
      return;
    }

    setBusinessId(business.id);
    await loadReservations(business.id, "");
    setLoading(false);
  };

  const loadReservations = async (bizId, filterDate = "") => {
    setLoadingList(true);

    let query = supabase
      .from("bookings")
      .select("*")
      .eq("business_id", bizId)
      .order("date", { ascending: true })
      .order("hour", { ascending: true });

    if (filterDate) query = query.eq("date", filterDate);

    const { data } = await query;
    setReservations(data || []);
    setLoadingList(false);
  };

  const handleFilter = () => {
    loadReservations(businessId, date);
  };

  // Agrupar reservas por día
  const grouped = reservations.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600 text-lg">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">

      {/* Volver */}
      <button
        className="text-blue-600 mb-6 hover:underline"
        onClick={() => navigate("/dashboard")}
      >
        ← Volver al Dashboard
      </button>

      <h1 className="text-3xl font-bold text-blue-700 mb-6">Reservas</h1>

      {/* FILTRO */}
      <div className="bg-white border rounded-xl shadow-sm p-5 mb-8 flex flex-col md:flex-row gap-4 md:items-center">

        <input
          type="date"
          className="border p-2 rounded w-full md:w-auto"
          onChange={(e) => setDate(e.target.value)}
        />

        <button
          onClick={handleFilter}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded font-semibold"
        >
          Filtrar
        </button>

        <button
          onClick={() => { setDate(""); loadReservations(businessId, ""); }}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded font-semibold"
        >
          Limpiar filtro
        </button>

        <button
          onClick={() => loadReservations(businessId, date)}
          className="bg-black text-white px-4 py-2 rounded font-semibold"
        >
          Actualizar ahora
        </button>
      </div>

      {/* LISTA */}
      {loadingList ? (
        <p className="text-gray-500 text-sm">Cargando reservas...</p>
      ) : reservations.length === 0 ? (
        <p className="text-gray-600">No hay reservas para esta fecha.</p>
      ) : (
        Object.keys(grouped).map((day) => (
          <div key={day} className="mb-10">
            
            {/* Título del día */}
            <h2 className="text-xl font-semibold text-blue-700 mb-3">
              {day}
            </h2>

            <div className="space-y-3">
              {grouped[day].map((r) => (
                <div
                  key={r.id}
                  className="bg-white border rounded-xl shadow-sm p-4 flex justify-between"
                >

                  <div>
                    <p className="text-lg font-bold text-gray-800">
                      {r.hour.slice(0, 5)} — {r.service_name}
                    </p>

                    <p className="font-semibold mt-1">{r.customer_name}</p>

                    <p className="text-sm text-gray-600">
                      {r.customer_email}
                    </p>

                    {r.customer_phone && (
                      <p className="text-sm text-gray-600">
                        Tel: {r.customer_phone}
                      </p>
                    )}
                  </div>

                  <div className="text-right">

                    <span
                      className={`px-3 py-1 text-xs rounded-full font-semibold ${
                        r.deposit_paid
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {r.deposit_paid ? "Con seña" : "Sin seña"}
                    </span>

                    <p className="text-xs text-gray-500 mt-1">
                      {r.status || "confirmado"}
                    </p>
                  </div>

                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
