import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Bookings() {
  const [businessId, setBusinessId] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [date, setDate] = useState("");
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
    loadReservations(business.id, date);
  };

  const loadReservations = async (bizId, filterDate) => {
    let query = supabase
      .from("bookings")
      .select("*")
      .eq("business_id", bizId)
      .order("date", { ascending: true })
      .order("hour", { ascending: true });

    if (filterDate) query = query.eq("date", filterDate);

    const { data } = await query;
    setReservations(data || []);
  };

  const handleFilter = () => {
    loadReservations(businessId, date);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* Volver */}
      <button
        className="text-blue-600 mb-4 hover:underline"
        onClick={() => navigate("/dashboard")}
      >
        ← Volver al Dashboard
      </button>

      <h1 className="text-3xl font-bold text-blue-700 mb-4">Reservas</h1>

      {/* FILTRO DE FECHA */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="date"
          className="border p-2 rounded"
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          onClick={handleFilter}
          className="bg-black text-white p-2 px-4 rounded"
        >
          Filtrar
        </button>
      </div>

      {/* LISTA */}
      {reservations.length === 0 ? (
        <p className="text-gray-600">No hay reservas para esta fecha.</p>
      ) : (
        <ul className="bg-white border rounded-xl shadow-sm divide-y">
          {reservations.map((r) => (
            <li key={r.id} className="py-4 px-3 flex justify-between items-center">
              
              {/* Datos principales */}
              <div>
                <p className="text-lg font-semibold text-blue-700">
                  {r.hour.slice(0, 5)} hs
                </p>

                <p className="font-semibold">{r.customer_name}</p>
                <p className="text-sm text-gray-600">{r.customer_email}</p>

                <p className="mt-1 text-sm">
                  Servicio: <b>{r.service_name}</b>
                </p>

                <p className="text-gray-600 text-sm">
                  Fecha: {r.date}
                </p>
              </div>

              {/* ESTADO / SEÑA */}
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

            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
