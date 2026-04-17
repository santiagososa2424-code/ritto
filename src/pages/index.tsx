import { useRouter } from 'next/router';

export default function LandingPage() {
  const router = useRouter();
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --green: #0a7c59;
          --green-mid: #1a9970;
          --green-light: #e6f4ef;
          --bg: #f5f5f7;
          --dark: #111111;
          --gray: #6b6b6b;
          --border: #e0e0e0;
          --white: #ffffff;
        }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); line-height: 1.6; }

        .nav { background: rgba(245,245,247,0.88); backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); padding: 0 2rem; display: flex; align-items: center; justify-content: space-between; height: 62px; position: sticky; top: 0; z-index: 100; }
        .logo { font-family: 'DM Serif Display', serif; font-size: 22px; color: var(--green); letter-spacing: -0.3px; cursor: pointer; }
        .nav-btns { display: flex; align-items: center; gap: 8px; }
        .btn-login { background: transparent; color: var(--dark); border: 1.5px solid var(--border); padding: 8px 20px; border-radius: 9px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; }
        .nav-cta { background: var(--green); color: #fff; border: none; padding: 9px 22px; border-radius: 9px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }

        .hero { max-width: 880px; margin: 0 auto; padding: 96px 2rem 72px; text-align: center; }
        .badge { display: inline-flex; align-items: center; gap: 7px; background: var(--green-light); color: var(--green); border: 1px solid rgba(10,124,89,0.22); border-radius: 20px; padding: 5px 15px; font-size: 13px; font-weight: 500; margin-bottom: 32px; }
        .badge-dot { width: 7px; height: 7px; background: var(--green); border-radius: 50%; }
        .hero h1 { font-family: 'DM Serif Display', serif; font-size: clamp(40px,6vw,68px); line-height: 1.08; color: var(--dark); margin-bottom: 24px; letter-spacing: -1.5px; }
        .hero h1 em { font-style: italic; color: var(--green); }
        .hero-sub { font-size: clamp(16px,2vw,19px); color: var(--gray); max-width: 540px; margin: 0 auto 44px; line-height: 1.65; }
        .hero-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .btn-primary { background: var(--green); color: #fff; border: none; padding: 14px 34px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 16px; font-weight: 600; cursor: pointer; }
        .btn-ghost { background: transparent; color: var(--dark); border: 1.5px solid var(--border); padding: 14px 28px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 16px; font-weight: 500; cursor: pointer; }

        .demo-wrap { max-width: 740px; margin: 72px auto 0; padding: 0 2rem; }
        .demo-window { background: var(--white); border-radius: 16px; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 4px 48px rgba(0,0,0,0.07); }
        .demo-bar { background: #f0f0f2; padding: 12px 16px; display: flex; gap: 6px; align-items: center; }
        .demo-dot { width: 10px; height: 10px; border-radius: 50%; }
        .demo-body { padding: 28px; }
        .upload-zone { border: 2px dashed var(--border); border-radius: 12px; padding: 38px 20px; text-align: center; background: var(--bg); margin-bottom: 24px; }
        .upload-icon { width: 44px; height: 44px; background: var(--green-light); border-radius: 10px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; }
        .upload-zone p { font-size: 14px; color: var(--gray); }
        .upload-zone strong { color: var(--green); font-weight: 600; }
        .result-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .result-table th { text-align: left; padding: 8px 12px; color: var(--gray); font-weight: 500; border-bottom: 1px solid var(--border); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .result-table td { padding: 10px 12px; border-bottom: 1px solid var(--bg); }
        .result-table tr:last-child td { border-bottom: none; }
        .pill { display: inline-block; background: var(--green-light); color: var(--green); border-radius: 6px; padding: 2px 9px; font-size: 11px; font-weight: 600; }

        .section { padding: 80px 2rem; }
        .section-inner { max-width: 880px; margin: 0 auto; }
        .section-label { font-size: 12px; font-weight: 600; color: var(--green); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .section-title { font-family: 'DM Serif Display', serif; font-size: clamp(28px,4vw,42px); line-height: 1.12; margin-bottom: 48px; color: var(--dark); letter-spacing: -0.5px; }

        .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
        .feat-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 28px; }
        .feat-icon { width: 40px; height: 40px; background: var(--green-light); border-radius: 10px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; font-size: 19px; }
        .feat-card h3 { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
        .feat-card p { font-size: 14px; color: var(--gray); line-height: 1.6; }

        .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
        .price-card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 32px; position: relative; }
        .price-card.featured { border: 2px solid var(--green); }
        .popular-badge { position: absolute; top: -13px; left: 50%; transform: translateX(-50%); background: var(--green); color: #fff; padding: 4px 18px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; }
        .price-name { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
        .price-amount { font-family: 'DM Serif Display', serif; font-size: 44px; line-height: 1; margin: 10px 0 4px; color: var(--dark); }
        .price-period { font-size: 13px; color: var(--gray); margin-bottom: 24px; }
        .price-list { list-style: none; margin-bottom: 28px; }
        .price-list li { padding: 7px 0; font-size: 14px; color: var(--gray); display: flex; gap: 8px; align-items: flex-start; border-bottom: 1px solid var(--bg); }
        .price-list li:last-child { border-bottom: none; }
        .check { color: var(--green); font-weight: 700; flex-shrink: 0; }

        .how-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
        .how-step { text-align: center; }
        .how-num { width: 44px; height: 44px; border-radius: 50%; background: var(--green); color: #fff; font-size: 18px; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .how-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
        .how-desc { font-size: 14px; color: var(--gray); line-height: 1.6; }
        .how-connector { display: flex; align-items: center; justify-content: center; padding-top: 22px; }

        .faq { display: flex; flex-direction: column; gap: 12px; max-width: 620px; margin: 0 auto; }
        .faq-item { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; }
        .faq-q { font-size: 14px; font-weight: 600; color: var(--dark); margin-bottom: 6px; }
        .faq-a { font-size: 14px; color: var(--gray); line-height: 1.6; }

        .cta-wrap { padding: 0 2rem 80px; margin-top: 80px; }
        .cta-section { max-width: 880px; margin: 0 auto; background: var(--dark); color: #fff; text-align: center; padding: 80px 2rem; border-radius: 24px; }
        .cta-section h2 { font-family: 'DM Serif Display', serif; font-size: clamp(28px,4vw,44px); margin-bottom: 16px; letter-spacing: -0.5px; }
        .cta-section p { color: rgba(255,255,255,0.6); font-size: 17px; margin-bottom: 36px; }
        .btn-white { background: #fff; color: var(--dark); border: none; padding: 14px 34px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 16px; font-weight: 600; cursor: pointer; }
        @media (max-width: 600px) { .how-steps { grid-template-columns: 1fr; gap: 20px; } }

        footer { max-width: 880px; margin: 0 auto; padding: 32px 2rem; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 12px; }
        footer p { font-size: 13px; color: var(--gray); }

        @media (max-width: 480px) {
          .btn-login { display: none; }
          .nav { padding: 0 1.25rem; }
        }
      `}</style>

      <nav className="nav">
        <div className="logo" onClick={() => router.push('/')}>ritto</div>
        <div className="nav-btns">
          <button className="btn-login" onClick={() => router.push('/login')}>Iniciar sesión</button>
          <button className="nav-cta" onClick={() => router.push('/login?signup=true')}>Empezar gratis</button>
        </div>
      </nav>

      <section className="hero">
        <div className="badge"><span className="badge-dot" />Hecho para empresas uruguayas</div>
        <h1>Tus facturas,<br />procesadas en <em>segundos</em></h1>
        <p className="hero-sub">Subí tus facturas y Ritto extrae automáticamente todos los datos fiscales — RUT, IVA, totales — listos para exportar a Excel.</p>
        <div className="hero-btns">
          <button className="btn-primary" onClick={() => router.push('/login?signup=true')}>Probar gratis 14 días</button>
          <button className="btn-ghost" onClick={() => router.push('/login')}>Iniciar sesión</button>
        </div>
      </section>

      <div className="demo-wrap">
        <div className="demo-window">
          <div className="demo-bar">
            <div className="demo-dot" style={{ background: '#ff5f57' }} />
            <div className="demo-dot" style={{ background: '#ffbd2e' }} />
            <div className="demo-dot" style={{ background: '#28c840' }} />
          </div>
          <div className="demo-body">
            <div className="upload-zone">
              <div className="upload-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p><strong>Arrastrá tus facturas</strong> o hacé clic para subir</p>
              <p style={{ marginTop: 4, fontSize: 12 }}>PDF, JPG, PNG, XML · múltiples a la vez</p>
            </div>
            <table className="result-table">
              <thead><tr><th>Proveedor</th><th>RUT</th><th>Neto</th><th>IVA</th><th>Total</th><th /></tr></thead>
              <tbody>
                <tr><td>Coca-Cola ANCAP</td><td>21.456.789-0</td><td>$12.400</td><td>$2.728</td><td>$15.128</td><td><span className="pill">Listo</span></td></tr>
                <tr><td>Frigorífico Las Piedras</td><td>30.112.440-3</td><td>$8.900</td><td>$890</td><td>$9.790</td><td><span className="pill">Listo</span></td></tr>
                <tr><td>Distribuidora Norte</td><td>21.998.001-7</td><td>$5.220</td><td>$1.148</td><td>$6.368</td><td><span className="pill">Listo</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-inner">
          <div className="section-label">Cómo funciona</div>
          <div className="section-title">Tres pasos y listo</div>
          <div className="how-steps">
            <div className="how-step">
              <div className="how-num">1</div>
              <div className="how-title">Subí tus facturas</div>
              <div className="how-desc">Arrastrá o seleccioná hasta 10 archivos a la vez — imágenes, PDFs o XMLs de CFE digital.</div>
            </div>
            <div className="how-step">
              <div className="how-num">2</div>
              <div className="how-title">Ritto extrae los datos</div>
              <div className="how-desc">IA lee cada factura y extrae RUT, fecha, proveedor, IVA y líneas de detalle automáticamente.</div>
            </div>
            <div className="how-step">
              <div className="how-num">3</div>
              <div className="how-title">Exportá a tu sistema</div>
              <div className="how-desc">Descargá el Excel con las columnas exactas de GNS Contable e importalo directamente.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#fff', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="section-inner">
          <div className="section-label">Funcionalidades</div>
          <div className="section-title">Todo lo que necesitás,<br />sin complicaciones</div>
          <div className="features">
            {[
              { icon: '⚡', title: 'Listo en segundos', desc: 'Subí la factura y en segundos tenés todos los datos extraídos: proveedor, RUT, fecha, IVA y totales. Sin tipear nada.' },
              { icon: '📊', title: 'Excel y CSV listos para importar', desc: 'Descargá el archivo con un clic e importalo directo a GNS, ZetaSoftware o Siigo. Columnas exactas, sin retoques.' },
              { icon: '👥', title: 'Trabajo en equipo', desc: 'En los planes Pyme y Empresa, todo el equipo comparte el mismo historial de facturas. Invitás usuarios desde Configuración.' },
              { icon: '📁', title: 'Foto, PDF o XML', desc: 'Sacá una foto con el celular, subí el PDF o el XML digital de DGI — los tres funcionan. Hasta 10 facturas a la vez.' },
              { icon: '🔒', title: 'Tus datos seguros', desc: 'Los archivos se eliminan del servidor después de procesarse. Los datos quedan guardados solo en tu cuenta, protegidos con cifrado.' },
              { icon: '🇺🇾', title: 'Hecho para Uruguay', desc: 'Entiende el IVA básico (22%), mínimo (10%) y exonerado. Compatible con CFE de DGI y todos los formatos de facturas locales.' },
            ].map((f) => (
              <div className="feat-card" key={f.title}>
                <div className="feat-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-inner">
          <div className="section-label">Planes</div>
          <div className="section-title">Elegí el plan<br />que se adapta a tu empresa</div>
          <div className="pricing-grid">
            <div className="price-card">
              <div className="price-name">Pro</div>
              <div className="price-amount">$490</div>
              <div className="price-period">UYU/mes</div>
              <ul className="price-list">
                <li><span className="check">✓</span>1 usuario · 1 empresa</li>
                <li><span className="check">✓</span>Facturas ilimitadas</li>
                <li><span className="check">✓</span>PDF, imagen y XML CFE</li>
                <li><span className="check">✓</span>Exportación a Excel y CSV</li>
                <li><span className="check">✓</span>Soporte por email</li>
              </ul>
              <button className="btn-ghost" style={{ width: '100%' }} onClick={() => router.push('/login?signup=true')}>Probar 14 días gratis</button>
            </div>
            <div className="price-card featured">
              <div className="popular-badge">Más popular</div>
              <div className="price-name">Pyme</div>
              <div className="price-amount">$1.990</div>
              <div className="price-period">UYU/mes</div>
              <ul className="price-list">
                <li><span className="check">✓</span>Hasta 5 usuarios · 1 empresa</li>
                <li><span className="check">✓</span>Facturas ilimitadas</li>
                <li><span className="check">✓</span>PDF, imagen y XML CFE</li>
                <li><span className="check">✓</span>Exportación a Excel y CSV</li>
                <li><span className="check">✓</span>Historial compartido del equipo</li>
                <li><span className="check">✓</span>Soporte prioritario</li>
              </ul>
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => router.push('/login?signup=true')}>Probar 14 días gratis</button>
            </div>
            <div className="price-card">
              <div className="price-name">Empresa</div>
              <div className="price-amount">$4.990</div>
              <div className="price-period">UYU/mes</div>
              <ul className="price-list">
                <li><span className="check">✓</span>Hasta 20 usuarios · 1 empresa</li>
                <li><span className="check">✓</span>Facturas ilimitadas</li>
                <li><span className="check">✓</span>PDF, imagen y XML CFE</li>
                <li><span className="check">✓</span>Exportación a Excel y CSV</li>
                <li><span className="check">✓</span>Historial compartido del equipo</li>
                <li><span className="check">✓</span>Soporte prioritario</li>
                <li><span className="check">✓</span>Onboarding personalizado</li>
              </ul>
              <button className="btn-ghost" style={{ width: '100%' }} onClick={() => router.push('/login?signup=true')}>Probar 14 días gratis</button>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#fff', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="section-inner">
          <div className="section-label">Preguntas frecuentes</div>
          <div className="section-title" style={{ marginBottom: 32 }}>FAQ</div>
          <div className="faq">
            {[
              { q: '¿Funciona con cualquier factura uruguaya?', a: 'Sí. Procesamos fotos de celular, PDFs y archivos XML de CFE digital de DGI. Si tenés la factura en papel, sacale una foto y listo.' },
              { q: '¿Con qué sistemas contables es compatible?', a: 'Compatible con GNS Contable, ZetaSoftware y Siigo. El archivo que descargás ya tiene las columnas exactas que necesita cada sistema — solo importarlo.' },
              { q: '¿Cuántos usuarios puede usar una misma cuenta?', a: 'En el plan Pro es 1 usuario. En Pyme hasta 5 personas comparten la misma empresa y ven las mismas facturas. En Empresa hasta 20 usuarios.' },
              { q: '¿Qué pasa cuando se vence la prueba gratuita?', a: 'Tu cuenta queda pausada pero no perdés nada. Activás tu plan desde "Mi Plan" y retomás donde estabas con todo el historial.' },
              { q: '¿Mis facturas están seguras?', a: 'Sí. Los archivos se eliminan del servidor inmediatamente después de procesar. Los datos quedan guardados solo en tu cuenta, cifrados y protegidos.' },
              { q: '¿Necesito saber de contabilidad para usarlo?', a: 'No. Subís la factura, Ritto extrae los datos y descargás el archivo. Si tenés dudas sobre qué hacer con el archivo, tu contador te puede guiar en dos minutos.' },
            ].map((f) => (
              <div className="faq-item" key={f.q}>
                <div className="faq-q">{f.q}</div>
                <div className="faq-a">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="cta-wrap">
        <div className="cta-section">
          <h2>Empezá hoy</h2>
          <p>14 días gratis, sin tarjeta de crédito. Cancelás cuando quieras.</p>
          <button className="btn-white" onClick={() => router.push('/login?signup=true')}>Crear cuenta gratis</button>
        </div>
      </div>

      <footer>
        <div className="logo">ritto</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <p>© 2025 ritto.lat · Uruguay</p>
          <a href="/terminos" style={{ fontSize: 13, color: 'var(--gray)', textDecoration: 'none' }}>Términos</a>
          <a href="/privacidad" style={{ fontSize: 13, color: 'var(--gray)', textDecoration: 'none' }}>Privacidad</a>
          <a href="mailto:soporte@ritto.lat" style={{ fontSize: 13, color: 'var(--gray)', textDecoration: 'none' }}>Soporte</a>
        </div>
      </footer>
    </>
  );
}
