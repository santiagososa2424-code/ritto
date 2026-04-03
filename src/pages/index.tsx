import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ritto · Procesá tus facturas en segundos",
  description:
    "Subí tus facturas y Ritto extrae automáticamente todos los datos fiscales — RUT, IVA, totales — listos para exportar a Excel.",
};

export default function LandingPage() {
  return (
    <>
      {/* ── Fuentes ── */}
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

        body {
          font-family: 'Figtree', sans-serif;
          background: var(--bg);
          color: var(--dark);
          line-height: 1.6;
        }

        /* ── Nav ── */
        .nav {
          background: rgba(245, 245, 247, 0.88);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border);
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 62px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .logo {
          font-family: 'DM Serif Display', serif;
          font-size: 22px;
          color: var(--green);
          letter-spacing: -0.3px;
        }
        .nav-cta {
          background: var(--green);
          color: #fff;
          border: none;
          padding: 9px 22px;
          border-radius: 9px;
          font-family: 'Figtree', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .nav-cta:hover { background: var(--green-mid); }

        /* ── Hero ── */
        .hero {
          max-width: 880px;
          margin: 0 auto;
          padding: 96px 2rem 72px;
          text-align: center;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: var(--green-light);
          color: var(--green);
          border: 1px solid rgba(10, 124, 89, 0.22);
          border-radius: 20px;
          padding: 5px 15px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 32px;
        }
        .badge-dot {
          width: 7px;
          height: 7px;
          background: var(--green);
          border-radius: 50%;
        }
        .hero h1 {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(40px, 6vw, 68px);
          line-height: 1.08;
          color: var(--dark);
          margin-bottom: 24px;
          letter-spacing: -1.5px;
        }
        .hero h1 em {
          font-style: italic;
          color: var(--green);
        }
        .hero-sub {
          font-size: clamp(16px, 2vw, 19px);
          color: var(--gray);
          max-width: 540px;
          margin: 0 auto 44px;
          line-height: 1.65;
        }
        .hero-btns {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn-primary {
          background: var(--green);
          color: #fff;
          border: none;
          padding: 14px 34px;
          border-radius: 10px;
          font-family: 'Figtree', sans-serif;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-primary:hover { background: var(--green-mid); }
        .btn-ghost {
          background: transparent;
          color: var(--dark);
          border: 1.5px solid var(--border);
          padding: 14px 28px;
          border-radius: 10px;
          font-family: 'Figtree', sans-serif;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 0.15s;
        }
        .btn-ghost:hover { border-color: #bbb; }

        /* ── Demo window ── */
        .demo-wrap {
          max-width: 740px;
          margin: 72px auto 0;
          padding: 0 2rem;
        }
        .demo-window {
          background: var(--white);
          border-radius: 16px;
          border: 1px solid var(--border);
          overflow: hidden;
          box-shadow: 0 4px 48px rgba(0, 0, 0, 0.07);
        }
        .demo-bar {
          background: #f0f0f2;
          padding: 12px 16px;
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .demo-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .demo-body { padding: 28px; }
        .upload-zone {
          border: 2px dashed var(--border);
          border-radius: 12px;
          padding: 38px 20px;
          text-align: center;
          background: var(--bg);
          margin-bottom: 24px;
        }
        .upload-icon {
          width: 44px;
          height: 44px;
          background: var(--green-light);
          border-radius: 10px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .upload-zone p { font-size: 14px; color: var(--gray); }
        .upload-zone strong { color: var(--green); font-weight: 600; }
        .result-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .result-table th {
          text-align: left;
          padding: 8px 12px;
          color: var(--gray);
          font-weight: 500;
          border-bottom: 1px solid var(--border);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .result-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--bg);
        }
        .result-table tr:last-child td { border-bottom: none; }
        .pill {
          display: inline-block;
          background: var(--green-light);
          color: var(--green);
          border-radius: 6px;
          padding: 2px 9px;
          font-size: 11px;
          font-weight: 600;
        }

        /* ── Sections ── */
        .section { padding: 80px 2rem; }
        .section-inner { max-width: 880px; margin: 0 auto; }
        .section-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--green);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        .section-title {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1.12;
          margin-bottom: 48px;
          color: var(--dark);
          letter-spacing: -0.5px;
        }

        /* ── Features ── */
        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        .feat-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 28px;
        }
        .feat-icon {
          width: 40px;
          height: 40px;
          background: var(--green-light);
          border-radius: 10px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
        }
        .feat-card h3 { font-size: 15px; font-weight: 600; margin-bottom: 8px; }
        .feat-card p { font-size: 14px; color: var(--gray); line-height: 1.6; }

        /* ── Pricing ── */
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 20px;
        }
        .price-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 32px;
          position: relative;
        }
        .price-card.featured { border: 2px solid var(--green); }
        .popular-badge {
          position: absolute;
          top: -13px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--green);
          color: #fff;
          padding: 4px 18px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .price-name { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
        .price-amount {
          font-family: 'DM Serif Display', serif;
          font-size: 44px;
          line-height: 1;
          margin: 10px 0 4px;
          color: var(--dark);
        }
        .price-period { font-size: 13px; color: var(--gray); margin-bottom: 24px; }
        .price-list { list-style: none; margin-bottom: 28px; }
        .price-list li {
          padding: 7px 0;
          font-size: 14px;
          color: var(--gray);
          display: flex;
          gap: 8px;
          align-items: flex-start;
          border-bottom: 1px solid var(--bg);
        }
        .price-list li:last-child { border-bottom: none; }
        .check { color: var(--green); font-weight: 700; flex-shrink: 0; }

        /* ── CTA ── */
        .cta-wrap { padding: 0 2rem 80px; }
        .cta-section {
          max-width: 880px;
          margin: 0 auto;
          background: var(--dark);
          color: #fff;
          text-align: center;
          padding: 80px 2rem;
          border-radius: 24px;
        }
        .cta-section h2 {
          font-family: 'DM Serif Display', serif;
          font-size: clamp(28px, 4vw, 44px);
          margin-bottom: 16px;
          letter-spacing: -0.5px;
        }
        .cta-section p { color: rgba(255, 255, 255, 0.6); font-size: 17px; margin-bottom: 36px; }
        .btn-white {
          background: #fff;
          color: var(--dark);
          border: none;
          padding: 14px 34px;
          border-radius: 10px;
          font-family: 'Figtree', sans-serif;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        /* ── Footer ── */
        footer {
          max-width: 880px;
          margin: 0 auto;
          padding: 32px 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1px solid var(--border);
          flex-wrap: wrap;
          gap: 12px;
        }
        footer p { font-size: 13px; color: var(--gray); }
      `}</style>

      {/* ── Nav ── */}
      <nav className="nav">
        <div className="logo">Ritto</div>
        <button className="nav-cta">Empezar gratis</button>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="badge">
          <span className="badge-dot" />
          Hecho para empresas uruguayas
        </div>
        <h1>
          Tus facturas,<br />
          procesadas en <em>segundos</em>
        </h1>
        <p className="hero-sub">
          Subí tus facturas y Ritto extrae automáticamente todos los datos
          fiscales — RUT, IVA, totales — listos para exportar a Excel.
        </p>
        <div className="hero-btns">
          <button className="btn-primary">Probar gratis 7 días</button>
          <button className="btn-ghost">Ver cómo funciona</button>
        </div>
      </section>

      {/* ── Demo window ── */}
      <div className="demo-wrap">
        <div className="demo-window">
          <div className="demo-bar">
            <div className="demo-dot" style={{ background: "#ff5f57" }} />
            <div className="demo-dot" style={{ background: "#ffbd2e" }} />
            <div className="demo-dot" style={{ background: "#28c840" }} />
          </div>
          <div className="demo-body">
            <div className="upload-zone">
              <div className="upload-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p><strong>Arrastrá tus facturas</strong> o hacé clic para subir</p>
              <p style={{ marginTop: 4, fontSize: 12 }}>PDF, JPG, PNG · hasta 32 por vez</p>
            </div>
            <table className="result-table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>RUT</th>
                  <th>Neto</th>
                  <th>IVA</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Coca-Cola ANCAP</td>
                  <td>21.456.789-0</td>
                  <td>$12.400</td>
                  <td>$2.728</td>
                  <td>$15.128</td>
                  <td><span className="pill">Listo</span></td>
                </tr>
                <tr>
                  <td>Frigorífico Las Piedras</td>
                  <td>30.112.440-3</td>
                  <td>$8.900</td>
                  <td>$890</td>
                  <td>$9.790</td>
                  <td><span className="pill">Listo</span></td>
                </tr>
                <tr>
                  <td>Distribuidora Norte</td>
                  <td>21.998.001-7</td>
                  <td>$5.220</td>
                  <td>$1.148</td>
                  <td>$6.368</td>
                  <td><span className="pill">Listo</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className="section">
        <div className="section-inner">
          <div className="section-label">Funcionalidades</div>
          <div className="section-title">
            Todo lo que necesitás,<br />sin complicaciones
          </div>
          <div className="features">
            {[
              { icon: "📄", title: "100% de precisión", desc: "Ritto extrae RUT, IVA, líneas de producto y totales sin errores manuales." },
              { icon: "📊", title: "Exportá a Excel", desc: "Un clic y tenés tu resumen en formato DGI listo para contabilidad." },
              { icon: "🔒", title: "Multi-empresa", desc: "Gestioná varias empresas desde una sola cuenta, con datos separados." },
              { icon: "⚡", title: "Hasta 32 facturas", desc: "Procesá lotes grandes de una sola vez, sin perder tiempo uno por uno." },
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

      {/* ── Pricing ── */}
      <section className="section" style={{ background: "#fff", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="section-inner">
          <div className="section-label">Planes</div>
          <div className="section-title">Simple y transparente</div>
          <div className="pricing-grid">
            {/* Free */}
            <div className="price-card">
              <div className="price-name">Gratis</div>
              <div className="price-amount">$0</div>
              <div className="price-period">7 días de prueba · sin tarjeta</div>
              <ul className="price-list">
                <li><span className="check">✓</span>Hasta 32 facturas por lote</li>
                <li><span className="check">✓</span>Exportación a Excel</li>
                <li><span className="check">✓</span>1 empresa</li>
              </ul>
              <button className="btn-ghost" style={{ width: "100%" }}>Empezar prueba</button>
            </div>
            {/* Pro */}
            <div className="price-card featured">
              <div className="popular-badge">Más popular</div>
              <div className="price-name">Pro</div>
              <div className="price-amount">$490</div>
              <div className="price-period">UYU/mes · sin permanencia</div>
              <ul className="price-list">
                <li><span className="check">✓</span>Facturas ilimitadas</li>
                <li><span className="check">✓</span>Exportación a Excel</li>
                <li><span className="check">✓</span>Multi-empresa</li>
                <li><span className="check">✓</span>Soporte prioritario</li>
              </ul>
              <button className="btn-primary" style={{ width: "100%" }}>Empezar gratis</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="cta-wrap" style={{ marginTop: 80 }}>
        <div className="cta-section">
          <h2>Empezá hoy, sin riesgos</h2>
          <p>7 días gratis, sin tarjeta de crédito. Cancelás cuando quieras.</p>
          <button className="btn-white">Crear cuenta gratis</button>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer>
        <div className="logo">Ritto</div>
        <p>© 2025 ritto.lat · Uruguay</p>
      </footer>
    </>
  );
}
