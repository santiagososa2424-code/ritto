export default function BookingSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10">
      
      <div className="max-w-md w-full rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-2xl shadow-[0_18px_60px_rgba(0,0,0,0.65)] p-10 text-center animate-fadeIn space-y-6">

        {/* ICONO DE ÉXITO */}
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center shadow-inner">
            <span className="text-emerald-300 text-5xl font-bold">✓</span>
          </div>
        </div>

        {/* TÍTULO */}
        <h1 className="text-3xl font-semibold tracking-tight">
          ¡Reserva confirmada!
        </h1>

        {/* DESCRIPCIÓN */}
        <p className="text-sm text-slate-400 leading-relaxed">
          Tu reserva fue creada correctamente. Te enviamos un correo con todos los detalles.
        </p>

        {/* BOTÓN GOOGLE CALENDAR */}
        <a
          href="#"
          className="block w-full rounded-2xl bg-emerald-400 text-slate-950 font-semibold text-sm py-3 hover:bg-emerald-300 transition shadow-lg hover:scale-[1.02]"
        >
          Agregar a Google Calendar
        </a>

        {/* VOLVER A INICIO */}
        <a
          href="/"
          className="block w-full rounded-2xl border border-white/10 text-slate-200 font-semibold text-sm py-3 hover:bg-white/5 transition hover:scale-[1.02]"
        >
          Volver al inicio
        </a>

      </div>
    </div>
  );
}
