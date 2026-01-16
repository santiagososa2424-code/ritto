import { useNavigate } from "react-router-dom";

export default function Paywall() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-black to-blue-900 px-4 py-10 text-slate-50">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-slate-900/90 border border-emerald-400/40 rounded-3xl p-6 text-center shadow-[0_18px_60px_rgba(16,185,129,0.35)] backdrop-blur-xl">
          <p className="text-sm font-semibold mb-2">Tu plan gratuito finalizó</p>
          <p className="text-xs text-slate-300">
            Para seguir usando Ritto y ver tus reservas, activá tu plan por{" "}
            <span className="font-semibold">$690/mes</span>.
          </p>
          <p className="text-[10px] text-slate-400 mt-2">
            Sin permanencia · Cancelás cuando quieras.
          </p>

          <button
            type="button"
            onClick={() => navigate("/billing")}
            className="mt-5 w-full text-xs px-3 py-2 rounded-2xl bg-emerald-400 text-slate-950 font-semibold hover:bg-emerald-300 transition"
          >
            Activar plan
          </button>
        </div>
      </div>
    </div>
  );
}
