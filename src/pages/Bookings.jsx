import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Bookings() {
  const [businessId, setBusinessId] = useState(null);
  const [business, setBusiness] = useState(null);
  const [reservations, setReservations] = useState([]);

  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);

  const navigate = useNavigate();

  const depositEnabled = business?.deposit_enabled === true;

  useEffect(() => {
    loadBusiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBusiness = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: biz } = await supabase
      .from("businesses")
      .select("*")
      .eq("owner_id", user.id)
      .single();

    if (!biz) {
      navigate("/setup");
      return;
    }

    setBusiness(biz);
    setBusinessId(biz.id);
    await loadReservations(biz.id, "");
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

  /* ─────────────────────────────
     ESTADOS (MISMA LÓGICA QUE DASHBOARD)
  ───────────────────────────── */
  const uiStatus = (booking) => {
    if (!depositEnabled) return "confirmed";
    return booking?.status || "confirmed";
  };

  const statusLabel = (status) => {
    return status === "confirmed"
      ? "Confirmado"
      : status === "pending"
      ? "Pendiente"
      : status === "cancelled"
      ? "Rechazado"
      : "—";
  };

  const statusBadgeClasses = (status) => {
    return status === "confirmed"
      ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : status === "pending"
      ? "border border-amber-500/40 bg-amber-500/10 text-amber-300"
      : status === "cancelled"
      ? "border border-rose-500/40 bg-rose-500/10 text-rose-200"
      : "border border-white/20 bg-white/10 text-slate-300";
  };

  /* ─────────────────────────────
     ACCIONES SEÑA (FIX STORAGE)
  ───────────────────────────── */
  const openProof = (booking) => {
    // Si ya es URL absoluta (por ej transfer_pdf_url)
    if (
      booking?.transfer_pdf_url &&
      /^https?:\/\//i.test(booking.transfer_pdf_url)
    ) {
      window.open(booking.transfer_pdf_url, "_blank", "noopener,noreferrer");
      return;
    }

    // Path del bucket
    const path = booking?.deposit_receipt_path;
    if (!path) {
      toast.error("Este turno no tiene comprobante.");
      return;
    }

    // Convertir path → URL pública
    const { data, error } = supabase.storage
      .from("ritto_receipts")
      .getPublicUrl(path);

    if (error || !data?.publicUrl) {
      toast.error("No se pudo abrir el comprobante.");
      return;
    }

    window.open(data.publicUrl, "_blank", "noopener,noreferrer");
  };

  const confirmBooking = async (bookingId) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId);

      if (error) throw error;
      toast.success("Turno confirmado.");
      loadReservations(businessId, date);
    } catch (e) {
      console.error("confirmBooking error:", e);
      toast.error("No se pudo confirmar.");
    }
  };

  const rejectBooking = async (bookingId) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;
      toast.success("Turno rechazado.");
      loadReservations(businessId, date);
    } catch (e) {
      console.error("rejectBooking error:", e);
      toast.error("No se pudo rechazar.");
    }
  };

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
        <Header
          title="Reservas"
          subtitle="Acá podés ver todos los turnos filtrados por fecha."
        />

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
                {grouped[day].map((r) => {
                  const st = uiStatus(r);

                  return (
                    <div
                      key={r.id}
                      className="rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow p-5 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-lg text-slate-50 tracking-tight">
                          {r.hour?.slice(0, 5)} — {r.service_name}
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

                        {depositEnabled && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => openProof(r)}
                              className="text-[11px] px-3 py-1 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
                            >
                              Ver comprobante
                            </button>

                            {st === "pending" && (
                              <>
                                <button
                                  onClick={() => confirmBooking(r.id)}
                                  className="text-[11px] px-3 py-1 rounded-2xl border border-emerald-500/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition"
                                >
                                  Confirmar
                                </button>
                                <button
                                  onClick={() => rejectBooking(r.id)}
                                  className="text-[11px] px-3 py-1 rounded-2xl border border-rose-500/60 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20 transition"
                                >
                                  Rechazar
                                </button>
                              </>
                            )}
                          </div>
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

                        <p
                          className={`text-[11px] mt-2 inline-flex px-2 py-1 rounded-full ${statusBadgeClasses(
                            st
                          )}`}
                        >
                          {statusLabel(st)}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
