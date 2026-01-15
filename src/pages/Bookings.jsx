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

  const handleRefresh = () => {
    loadReservations(businessId, date);
  };

  const grouped = reservations.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="px-4 py-2 rounded-3xl bg-slate-900/80 border border-white/10 shadow-lg backdrop-blur-xl text-xs flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Cargando reservas...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Header */}
        <Header
          title="Reservas"
          subtitle="Acá podés ver todos los turnos filtrados por fecha."
        />

        {/* FILTRO */}
        <Card title="Filtrar reservas">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="date"
              className="input-ritto"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <button onClick={handleFilter} className="button-ritto">
              Filtrar
            </button>

            <button onClick={handleRefresh} className="button-ritto">
              Actualizar
            </button>
          </div>
        </Card>
        {/* LISTA */}
        {loadingList ? (
          <div className="text-slate-400 text-sm">Cargando reservas...</div>
        ) : reservations.length === 0 ? (
          <div className="text-slate-400 text-sm">
            No hay reservas para esta fecha.
          </div>
        ) : (
          Object.keys(grouped).map((day) => (
            <Card key={day} title={day}>
              <div className="space-y-3">
                {grouped[day].map((r) => (
                  <div
                    key={r.id}
                    className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow p-5 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-lg text-slate-50 tracking-tight">
                        {r.hour.slice(0, 5)} — {r.service_name}
                      </p>

                      <p className="text-sm font-semibold mt-1 text-slate-200">
                        {r.customer_name}
                      </p>

                      <p className="text-[12px] text-slate-400">
                        {r.customer_email}
                      </p>

                      {r.customer_phone && (
                        <p className="text-[12px] text-slate-400">
                          Tel: {r.customer_phone}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <span
                        className={`px-3 py-1 text-xs rounded-full font-semibold ${
                          r.deposit_paid
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-white/10 text-slate-300 border border-white/20"
                        }`}
                      >
                        {r.deposit_paid ? "Con seña" : "Sin seña"}
                      </span>

                      <p className="text-[11px] text-slate-500 mt-1">
                        {r.status || "confirmado"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------
   COMPONENTES
---------------------------------------------------- */

function Header({ title, subtitle }) {
  return (
    <div className="text-center space-y-1">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-xl p-6 space-y-6">
      {title && (
        <h2 className="text-xl font-semibold tracking-tight text-emerald-300">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
