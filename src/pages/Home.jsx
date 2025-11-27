export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0F1F] text-white px-6 py-10 flex items-center justify-center">
      <div className="max-w-4xl mx-auto text-center space-y-10">

        {/* Imagen principal */}
        <img 
          src="/landing_ritto.png" 
          alt="Ritto Landing" 
          className="w-full rounded-3xl shadow-2xl"
        />

        {/* Título y descripción */}
        <h1 className="text-4xl font-semibold">
          Agenda Automatizada
        </h1>

        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Gestión inteligente de turnos • Notificaciones automáticas • Diseño premium inspirado en Apple
        </p>

        {/* Beneficios (los mantenemos como en tu diseño) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="font-semibold mb-2">Notificación a clientes</h3>
            <p className="text-sm text-slate-400">Emails automáticos y precisos para cada reserva.</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="font-semibold mb-2">Recordatorios automáticos</h3>
            <p className="text-sm text-slate-400">Reduce ausencias avisando antes del turno.</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <h3 className="font-semibold mb-2">Servicio técnico en español</h3>
            <p className="text-sm text-slate-400">Soporte directo y humano siempre que lo necesites.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
