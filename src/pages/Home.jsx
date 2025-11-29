export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0F1F] text-white px-6 py-10 flex items-center justify-center">
      <div className="max-w-5xl mx-auto text-center space-y-10">

        {/* Imagen principal incrustada como BASE64 */}
        <img 
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAeAAAAJYCAYAAAA...MUCHO_TEXTO_BASE64_ACÁ..." 
          alt="Ritto Landing"
          className="w-full rounded-3xl shadow-2xl"
        />

        {/* Título y descripción */}
        <h1 className="text-4xl font-semibold">
          Agenda automatizada
        </h1>

        <p className="text-slate-300 text-lg max-w-2xl mx-auto">
          Simplifica tus reservas con una plataforma profesional.
        </p>

        {/* Beneficios */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 mt-10">

          <div className="space-y-2">
            <h3 className="font-semibold">Notificación a clientes</h3>
            <p className="text-sm text-slate-400">
              Mantén a tus clientes informados en cada paso.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Recordatorios automáticos</h3>
            <p className="text-sm text-slate-400">
              Envía recordatorios para evitar olvidos.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Panel de control</h3>
            <p className="text-sm text-slate-400">
              Accede fácilmente a informes y ajustes clave.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Servicio técnico en español</h3>
            <p className="text-sm text-slate-400">
              Soporte especializado siempre que lo necesites.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
