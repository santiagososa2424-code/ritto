export default function TerminosPage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Figtree', -apple-system, sans-serif; background: #f5f5f7; color: #111; }
        .wrap { max-width: 740px; margin: 0 auto; padding: 48px 24px 80px; }
        .logo { font-family: 'DM Serif Display', Georgia, serif; font-size: 26px; color: #0a7c59; margin-bottom: 36px; display: inline-block; text-decoration: none; }
        h1 { font-family: 'DM Serif Display', Georgia, serif; font-size: 30px; margin-bottom: 8px; }
        .date { font-size: 13px; color: #6b6b6b; margin-bottom: 32px; }
        h2 { font-size: 17px; font-weight: 700; margin: 28px 0 10px; }
        p, li { font-size: 14px; line-height: 1.75; color: #333; }
        ul { padding-left: 20px; display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
        a { color: #0a7c59; }
        .back { display: inline-flex; align-items: center; gap: 6px; color: #6b6b6b; font-size: 13px; text-decoration: none; margin-bottom: 28px; }
        .back:hover { color: #0a7c59; }
      `}</style>

      <div className="wrap">
        <a href="/" className="logo">ritto</a>
        <a href="/" className="back">← Volver al inicio</a>
        <h1>Términos y Condiciones</h1>
        <p className="date">Última actualización: abril 2025</p>

        <h2>1. Aceptación</h2>
        <p>Al acceder o usar Ritto (ritto.lat) aceptás estos términos. Si no estás de acuerdo, no uses el servicio.</p>

        <h2>2. Descripción del servicio</h2>
        <p>Ritto es un servicio SaaS que permite a empresas y profesionales de Uruguay subir comprobantes fiscales (facturas, tickets, CFE) en formato XML, PDF o imagen, extraer sus datos mediante inteligencia artificial y exportarlos a formatos compatibles con sistemas contables.</p>

        <h2>3. Cuenta y acceso</h2>
        <ul>
          <li>Debés proporcionar información verdadera al registrarte.</li>
          <li>Sos responsable de mantener la seguridad de tu contraseña.</li>
          <li>Ritto puede suspender cuentas que violen estos términos.</li>
        </ul>

        <h2>4. Planes y pagos</h2>
        <ul>
          <li>Ritto ofrece planes de suscripción mensual (Pro, Pyme, Empresa).</li>
          <li>El período de prueba gratuito es de 14 días desde el registro.</li>
          <li>Los precios pueden cambiar con 30 días de preaviso.</li>
          <li>No realizamos reembolsos por períodos parciales.</li>
        </ul>

        <h2>5. Uso aceptable</h2>
        <p>No podés usar Ritto para:</p>
        <ul>
          <li>Cargar documentos de terceros sin autorización.</li>
          <li>Intentar acceder a datos de otros usuarios.</li>
          <li>Realizar ingeniería inversa o automatización masiva no autorizada.</li>
          <li>Cualquier actividad ilegal bajo la legislación uruguaya.</li>
        </ul>

        <h2>6. Propiedad intelectual</h2>
        <p>El software, diseño y marca "Ritto" son propiedad de sus desarrolladores. Tus documentos y datos siguen siendo tuyos.</p>

        <h2>7. Limitación de responsabilidad</h2>
        <p>Ritto no garantiza la exactitud al 100% de la extracción de datos por IA. Siempre revisá los datos antes de usarlos en declaraciones oficiales. No somos responsables de errores contables derivados del uso del servicio.</p>

        <h2>8. Cancelación</h2>
        <p>Podés cancelar tu suscripción en cualquier momento desde la sección "Mi Plan". Seguirás teniendo acceso hasta el final del período pagado.</p>

        <h2>9. Cambios en los términos</h2>
        <p>Podemos actualizar estos términos. Te notificaremos por email con al menos 15 días de anticipación ante cambios materiales.</p>

        <h2>10. Contacto</h2>
        <p>Para consultas: <a href="mailto:soporte@ritto.lat">soporte@ritto.lat</a></p>
      </div>
    </>
  );
}
