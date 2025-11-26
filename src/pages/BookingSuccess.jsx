export default function BookingSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 px-4 py-10 flex items-center justify-center">
      <div className="max-w-md w-full rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-xl p-8 text-center space-y-6">

        {/* Icono */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <span className="text-emerald-300 text-4xl">✓</span>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">
          ¡Reserva confirmada!
        </h1>

        <p className="text-sm text-slate-400 leading-relaxed">
          Tu reserva ha sido creada correctamente. Te enviamos un correo con los detalles.
        </p>

        {/* Google Calendar */}
        <a
          href="#"
          className="block rounded-2xl bg-emerald-400 text-slate-950 font-semibold text-sm py-3 hover:bg-emerald-300 transition"
        >
          Agregar a Google Calendar
        </a>

        {/* Volver */}
        <a
          href="/"
          className="block rounded-2xl border border-white/10 text-slate-200 font-semibold text-sm py-3 hover:bg-white/5 transition"
        >
          Volver al inicio
        </a>

      </div>
    </div>
  );
}
