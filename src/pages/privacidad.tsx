export default function PrivacidadPage() {
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
        .highlight { background: #e6f4ef; border-left: 3px solid #0a7c59; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
      `}</style>

      <div className="wrap">
        <a href="/" className="logo">ritto</a>
        <a href="/" className="back">← Volver al inicio</a>
        <h1>Política de Privacidad</h1>
        <p className="date">Última actualización: abril 2025</p>

        <div className="highlight">
          <p><strong>Resumen:</strong> Tus facturas y datos fiscales son tuyos. Los almacenamos de forma segura solo para darte el servicio. No los vendemos ni compartimos con terceros salvo los proveedores técnicos necesarios para operar.</p>
        </div>

        <h2>1. Qué datos recopilamos</h2>
        <ul>
          <li><strong>Datos de cuenta:</strong> Email, nombre de empresa, plan seleccionado.</li>
          <li><strong>Archivos subidos:</strong> Imágenes, PDFs y XMLs de tus facturas (solo para extracción).</li>
          <li><strong>Datos extraídos:</strong> Proveedor, RUT, montos, IVA, fecha — guardados en tu historial.</li>
          <li><strong>Datos de uso:</strong> Cantidad de facturas procesadas, sistema contable seleccionado.</li>
        </ul>

        <h2>2. Cómo usamos tus datos</h2>
        <ul>
          <li>Para procesar y extraer información de tus facturas.</li>
          <li>Para mostrarte tu historial y estadísticas.</li>
          <li>Para gestionar tu cuenta y suscripción.</li>
          <li>Para enviarte comunicaciones relacionadas con el servicio (nunca publicidad de terceros).</li>
        </ul>

        <h2>3. Dónde se almacenan</h2>
        <p>Tus datos se almacenan en <strong>Supabase</strong> (base de datos PostgreSQL con cifrado en reposo y en tránsito, alojada en AWS). Los archivos subidos se procesan en memoria y no se almacenan permanentemente — solo los datos extraídos quedan en la base de datos.</p>

        <h2>4. Terceros involucrados</h2>
        <ul>
          <li><strong>Supabase</strong> — base de datos y autenticación. <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Ver su política</a></li>
          <li><strong>Google Gemini (AI)</strong> — procesamiento de imágenes y PDFs para extracción de datos. Los archivos se envían a la API de Google solo durante el procesamiento y no son usados para entrenamiento bajo los términos empresariales.</li>
          <li><strong>Vercel</strong> — hosting de la aplicación. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">Ver su política</a></li>
        </ul>

        <h2>5. Retención y eliminación</h2>
        <p>Guardamos tus datos mientras tengas una cuenta activa. Podés solicitar la eliminación de tu cuenta y todos tus datos escribiendo a <a href="mailto:soporte@ritto.lat">soporte@ritto.lat</a>. Los datos se eliminan dentro de los 30 días siguientes a la solicitud.</p>

        <h2>6. Tus derechos</h2>
        <ul>
          <li>Acceder a los datos que tenemos sobre vos.</li>
          <li>Corregir datos incorrectos.</li>
          <li>Solicitar la eliminación de tus datos.</li>
          <li>Exportar tus datos en formato CSV o Excel.</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>Usamos cookies de sesión estrictamente necesarias para mantenerte autenticado. No usamos cookies de seguimiento ni publicidad.</p>

        <h2>8. Seguridad</h2>
        <p>Toda la comunicación usa HTTPS. Los datos en la base de datos están cifrados. Usamos Row Level Security (RLS) para que ningún usuario pueda ver datos de otro.</p>

        <h2>9. Menores</h2>
        <p>Ritto está destinado a empresas y profesionales. No recopilamos datos de menores de 18 años de forma intencional.</p>

        <h2>10. Contacto</h2>
        <p>Para consultas sobre privacidad: <a href="mailto:soporte@ritto.lat">soporte@ritto.lat</a></p>
      </div>
    </>
  );
}
