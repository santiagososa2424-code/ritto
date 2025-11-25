export default function Landing() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      
      {/* NAVBAR */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <img
            src="/ritto-logo.svg"
            alt="Ritto"
            className="h-10"
          />
        </div>

        <div className="flex items-center gap-4">
          <a
            href="/login"
            className="text-blue-600 font-medium hover:text-blue-700"
          >
            Iniciar sesión
          </a>
          <a
            href="/register"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            Crear cuenta
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="flex flex-col items-center text-center mt-20 px-6">
        <h1 className="text-4xl font-bold text-blue-700 mb-4">
          Automatizá tu agenda con Ritto
        </h1>
        <p className="text-gray-600 text-lg max-w-2xl">
          Recibí reservas 24/7, eliminá llamadas y mensajes, y gestioná tu negocio
          desde una plataforma simple, rápida y moderna.
        </p>

        <a
          href="/register"
          className="mt-8 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          Comenzar gratis
        </a>
      </section>

      {/* BENEFICIOS */}
      <section className="mt-24 px-6 py-16 bg-gray-50">
        <h2 className="text-3xl font-bold text-center text-blue-700 mb-10">
          ¿Por qué usar Ritto?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">

          {/* Beneficio 1 */}
          <div className="bg-white shadow-sm border border-gray-100 p-6 rounded-xl text-center">
            <h3 className="text-xl font-semibold text-blue-600 mb-2">
              Reservas 24/7
            </h3>
            <p className="text-gray-600">
              Tus clientes pueden agendar cuando quieran, sin depender de respuestas.
            </p>
          </div>

          {/* Beneficio 2 */}
          <div className="bg-white shadow-sm border border-gray-100 p-6 rounded-xl text-center">
            <h3 className="text-xl font-semibold text-blue-600 mb-2">
              Agenda automática
            </h3>
            <p className="text-gray-600">
              Los turnos se gestionan solos; vos solo atendés al cliente.
            </p>
          </div>

          {/* Beneficio 3 */}
          <div className="bg-white shadow-sm border border-gray-100 p-6 rounded-xl text-center">
            <h3 className="text-xl font-semibold text-blue-600 mb-2">
              Link único para tu negocio
            </h3>
            <p className="text-gray-600">
              Compartí tu URL y recibí reservas sin complicaciones.
            </p>
          </div>

          {/* Beneficio 4 */}
          <div class="bg-white shadow-sm border border-gray-100 p-6 rounded-xl text-center">
            <h3 class="text-xl font-semibold text-blue-600 mb-2">
              Control total
            </h3>
            <p class="text-gray-600">
              Servicios, precios, horarios, bloqueos y capacidad por turno.
            </p>
          </div>

          {/* Beneficio 5 */}
          <div class="bg-white shadow-sm border border-gray-100 p-6 rounded-xl text-center">
            <h3 class="text-xl font-semibold text-blue-600 mb-2">
              Señas opcionales
            </h3>
            <p class="text-gray-600">
              Activá señas fijas o porcentuales para evitar ausencias.
            </p>
          </div>

          {/* Beneficio 6 */}
          <div class="bg-white shadow-sm border border-gray-100 p-6 rounded-xl text-center">
            <h3 class="text-xl font-semibold text-blue-600 mb-2">
              Todo desde tu panel
            </h3>
            <p class="text-gray-600">
              Revisá reservas, horarios y facturación desde un solo lugar.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center py-6 text-gray-500 text-sm">
        © {new Date().getFullYear()} Ritto — Agenda automatizada.
      </footer>
    </div>
  );
}
