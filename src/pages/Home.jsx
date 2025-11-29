import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0F1F] text-white px-6 py-10">
      
      {/* NAVBAR */}
      <div className="flex justify-between items-center max-w-6xl mx-auto mb-16">
        <div className="flex items-center gap-3">
          <img src="/ritto_icon.png" alt="Ritto Logo" className="w-8 h-8" />
          <span className="text-xl font-semibold">Ritto</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/login")}
            className="px-6 py-2 rounded-full border border-white/30 hover:bg-white/10 transition"
          >
            Iniciar sesión
          </button>

          <button
            onClick={() => navigate("/register")}
            className="px-6 py-2 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition"
          >
            Registrarse
          </button>
        </div>
      </div>

      {/* CONTENIDO CENTRAL */}
      <div className="max-w-4xl mx-auto text-center space-y-10">

        {/* Imagen */}
        <img 
          src="/landing_ritto.png"
          alt="Ritto Landing"
          className="w-full rounded-3xl shadow-2xl"
        />

        {/* Título */}
        <h1 className="text-4xl font-semibold">
          Agenda automatizada
        </h1>

        {/* Subtítulo */}
        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Simplificá tus reservas con una plataforma <span className="font-semibold text-white">profesional.</span>
        </p>

        {/* Beneficios */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mt-14">

          <div className="text-center space-y-2">
            <img src="/icon_mail.png" className="mx-auto w-10" />
            <h3 className="font-semibold">Notificación a clientes</h3>
            <p className="text-[13px] text-slate-400">Mantené a tus clientes informados en cada paso.</p>
          </div>

          <div className="text-center space-y-2">
            <img src="/icon_bell.png" className="mx-auto w-10" />
            <h3 className="font-semibold">Recordatorios automáticos</h3>
            <p className="text-[13px] text-slate-400">Enviá avisos automáticos para evitar olvidos.</p>
          </div>

          <div className="text-center space-y-2">
            <img src="/icon_chart.png" className="mx-auto w-10" />
            <h3 className="font-semibold">Panel de control</h3>
            <p className="text-[13px] text-slate-400">Accedé fácilmente a informes y ajustes clave.</p>
          </div>

          <div className="text-center space-y-2">
            <img src="/icon_support.png" className="mx-auto w-10" />
            <h3 className="font-semibold">Servicio técnico en español</h3>
            <p className="text-[13px] text-slate-400">Soporte especializado cuando lo necesites.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
