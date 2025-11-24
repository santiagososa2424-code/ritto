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

    // buscar negocio del usuario
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
      <h1 className="text-2xl font-bold mb-4">Reservas</h1>

      <div className="flex gap-3 mb-6">
        <input
          type="date"
          className="border p-2 rounded"
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          onClick={handleFilter}
          className="bg-black text-white p-2 rounded"
        >
          Filtrar
        </button>
      </div>

      {reservations.length === 0 ? (
        <p>No hay reservas.</p>
      ) : (
        <ul className="divide-y">
          {reservations.map((r) => (
            <li key={r.id} className="py-4">
              <p>
                <b>{r.customer_name}</b> — {r.customer_phone}
              </p>
              <p>
                Servicio: <b>{r.service_name}</b>
              </p>
              <p>
                {r.date} — {r.hour.slice(0, 5)} hs
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
