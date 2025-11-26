import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function Stats({ businessId }) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [mostUsedService, setMostUsedService] = useState(null);
  const [paidDeposits, setPaidDeposits] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const { data: monthBookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("business_id", businessId)
      .gte("date", start);

    setBookings(monthBookings || []);

    // servicio más usado
    if (monthBookings?.length) {
      const count = {};
      monthBookings.forEach((b) => {
        count[b.service_name] = (count[b.service_name] || 0) + 1;
      });
      const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
      setMostUsedService(top ? top[0] : null);
    }

    // señas
    const paid = monthBookings?.filter((b) => b.deposit_paid)?.length || 0;
    setPaidDeposits(paid);

    // facturación estimada
    const income =
      monthBookings?.reduce(
        (acc, b) => acc + Number(b.service_price || 0),
        0
      ) || 0;

    setTotalIncome(income);

    setLoading(false);
  };

  if (loading)
    return <p className="text-gray-600 mb-6">Cargando estadísticas...</p>;

  return (
    <div className="grid md:grid-cols-4 gap-6 mb-10">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-blue-700">Reservas del mes</h3>
        <p className="text-3xl font-bold text-gray-800">{bookings.length}</p>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-blue-700">
          Servicio más solicitado
        </h3>
        <p className="text-xl font-bold text-gray-800">
          {mostUsedService || "—"}
        </p>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-blue-700">Señas pagadas</h3>
        <p className="text-3xl font-bold text-green-600">{paidDeposits}</p>
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-blue-700">
          Ingresos estimados
        </h3>
        <p className="text-3xl font-bold text-gray-800">${totalIncome}</p>
      </div>
    </div>
  );
}
