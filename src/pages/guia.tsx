import { useState } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';

const sections = [
  { id: 'empezar', label: 'Cómo empezar' },
  { id: 'excel', label: 'Exportar a Excel' },
  { id: 'sheets', label: 'Conectar Google Sheets' },
  { id: 'columnas', label: 'Configurar columnas' },
  { id: 'tips', label: 'Sacarle el jugo' },
];

export default function GuiaPage() {
  const router = useRouter();
  const [active, setActive] = useState('empezar');

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7;
          --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0;
          --white: #ffffff;
        }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page-wrap { padding: 28px 28px 80px; max-width: 720px; }
        .page-title { font-family: 'DM Serif Display', serif; font-size: 28px; margin-bottom: 6px; }
        .page-sub { font-size: 14px; color: var(--gray); margin-bottom: 28px; }

        .tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 32px; }
        .tab {
          padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500;
          cursor: pointer; border: 1.5px solid var(--border); background: var(--white);
          color: var(--gray); font-family: 'Figtree', sans-serif; transition: all 0.15s;
        }
        .tab:hover { border-color: var(--green); color: var(--green); }
        .tab.active { background: var(--green); color: #fff; border-color: var(--green); font-weight: 600; }

        .section { display: none; }
        .section.visible { display: block; }

        .card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 24px; margin-bottom: 16px; }
        .card-icon { font-size: 28px; margin-bottom: 12px; }
        .card-title { font-size: 17px; font-weight: 700; margin-bottom: 8px; color: var(--dark); }
        .card-text { font-size: 14px; color: var(--gray); line-height: 1.7; }

        .steps { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; }
        .step { display: flex; gap: 14px; align-items: flex-start; }
        .step-num {
          width: 28px; height: 28px; border-radius: 50%; background: var(--green);
          color: #fff; font-size: 13px; font-weight: 700; display: flex;
          align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;
        }
        .step-content { flex: 1; }
        .step-title { font-size: 14px; font-weight: 600; margin-bottom: 3px; color: var(--dark); }
        .step-desc { font-size: 13px; color: var(--gray); line-height: 1.6; }

        .example-box {
          background: #f8fffe; border: 1.5px solid var(--green-light);
          border-radius: 10px; padding: 14px 16px; margin-top: 12px; overflow-x: auto;
        }
        .example-label { font-size: 11px; font-weight: 700; color: var(--green); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .example-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 500px; }
        .example-table th { background: var(--green); color: #fff; padding: 6px 10px; text-align: left; font-weight: 600; font-size: 12px; }
        .example-table td { padding: 5px 10px; border-bottom: 1px solid var(--border); color: var(--dark); }
        .example-table tr:last-child td { border-bottom: none; }

        .tip-list { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
        .tip { display: flex; gap: 10px; align-items: flex-start; }
        .tip-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .tip-text { font-size: 14px; color: var(--gray); line-height: 1.6; }
        .tip-text strong { color: var(--dark); }

        .badge-soon {
          display: inline-block; background: #f3e8ff; color: #6b21a8;
          border-radius: 20px; padding: 2px 10px; font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.3px; margin-left: 8px;
          vertical-align: middle;
        }

        .highlight {
          background: var(--green-light); border-left: 3px solid var(--green);
          border-radius: 0 8px 8px 0; padding: 12px 14px; margin-top: 12px;
          font-size: 13px; color: var(--dark); line-height: 1.6;
        }

        .btn-go {
          display: inline-block; margin-top: 14px;
          background: var(--green); color: #fff; border: none;
          padding: 10px 20px; border-radius: 8px; font-family: 'Figtree', sans-serif;
          font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none;
        }

        @media (max-width: 768px) {
          .page-wrap { padding: 18px 16px 80px; }
          .page-title { font-size: 22px; }
        }
      `}</style>

      <Sidebar active="guia" />

      <div className="with-sidebar">
        <div className="page-wrap">
          <h1 className="page-title">Guía de uso</h1>
          <p className="page-sub">Todo lo que necesitás saber para usar Ritto, explicado sin tecnicismos.</p>

          <div className="tabs">
            {sections.map((s) => (
              <button
                key={s.id}
                className={`tab${active === s.id ? ' active' : ''}`}
                onClick={() => setActive(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* EMPEZAR */}
          <div className={`section${active === 'empezar' ? ' visible' : ''}`}>
            <div className="card">
              <div className="card-icon">📄</div>
              <div className="card-title">¿Qué hace Ritto?</div>
              <div className="card-text">
                Subís tus facturas (foto, PDF o XML) y Ritto lee automáticamente los datos — proveedor, fecha, monto, IVA — y te los entrega ordenados en un archivo Excel o directamente en tu Google Sheets.
                <br /><br />
                Sin tipear a mano. Sin errores. En segundos.
              </div>
            </div>

            <div className="card">
              <div className="card-title">Primeros pasos</div>
              <div className="steps">
                <div className="step">
                  <div className="step-num">1</div>
                  <div className="step-content">
                    <div className="step-title">Subí una factura</div>
                    <div className="step-desc">En la pantalla de Facturas, tocá el recuadro grande o arrastrá un archivo. Podés subir foto, PDF o XML del DGI.</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">2</div>
                  <div className="step-content">
                    <div className="step-title">Esperá unos segundos</div>
                    <div className="step-desc">Ritto lee la factura y extrae todos los datos automáticamente. Ves el resultado en la lista de abajo.</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">3</div>
                  <div className="step-content">
                    <div className="step-title">Exportá</div>
                    <div className="step-desc">Cuando tenés las facturas que querés, tocá “Exportar a Excel” o “Exportar a Google Sheets” arriba a la derecha.</div>
                  </div>
                </div>
              </div>
              <div className="highlight">
                💡 <strong>El mejor tipo de archivo:</strong> los XML del DGI son instantáneos y 100% exactos. Si tu proveedor te los manda, usá esos primero.
              </div>
            </div>
          </div>

          {/* EXCEL */}
          <div className={`section${active === 'excel' ? ' visible' : ''}`}>
            <div className="card">
              <div className="card-icon">📊</div>
              <div className="card-title">Exportar a Excel</div>
              <div className="card-text">
                Ritto te descarga un archivo Excel nuevo con todas tus facturas. Para que los datos caigan en el lugar correcto de tu planilla existente, tenés que pegar las filas.
              </div>
              <div className="steps" style={{ marginTop: 16 }}>
                <div className="step">
                  <div className="step-num">1</div>
                  <div className="step-content">
                    <div className="step-title">Selecioná las facturas</div>
                    <div className="step-desc">Podés filtrar por mes si querés exportar solo un período.</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">2</div>
                  <div className="step-content">
                    <div className="step-title">Tocá “Exportar a Excel”</div>
                    <div className="step-desc">Se descarga un archivo .xlsx en tu dispositivo.</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">3</div>
                  <div className="step-content">
                    <div className="step-title">Abrí los dos archivos</div>
                    <div className="step-desc">El que descargaste de Ritto y tu planilla existente de Excel.</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">4</div>
                  <div className="step-content">
                    <div className="step-title">Copiá las filas de Ritto</div>
                    <div className="step-desc">Selecioná todas las filas con datos (sin el encabezado), copiá y pegá al final de tu planilla existente.</div>
                  </div>
                </div>
              </div>
              <div className="highlight">
                ✅ Si configuraste bien las columnas (ver sección “Configurar columnas”), los datos van a caer exactamente en las columnas correctas de tu planilla.
              </div>
            </div>
          </div>

          {/* SHEETS */}
          <div className={`section${active === 'sheets' ? ' visible' : ''}`}>
            <div className="card">
              <div className="card-icon">🟢</div>
              <div className="card-title">Conectar Google Sheets <span className="badge-soon">Próximamente</span></div>
              <div className="card-text">
                Con Google Sheets conectado, no tenés que descargar ni copiar nada. Exportás desde Ritto y las filas aparecen solas al final de tu hoja, sin tocar nada más.
              </div>
              <div className="steps" style={{ marginTop: 16 }}>
                <div className="step">
                  <div className="step-num">1</div>
                  <div className="step-content">
                    <div className="step-title">Conectás tu cuenta de Google</div>
                    <div className="step-desc">En Configuración, tocás “Conectar con Google” y le das permiso a Ritto para editar tu planilla.</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">2</div>
                  <div className="step-content">
                    <div className="step-title">Pegás el link de tu planilla</div>
                    <div className="step-desc">Abrís tu Google Sheets, copiás la URL de arriba y la pegás en el campo “URL de tu Google Sheet” en Configuración.</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">3</div>
                  <div className="step-content">
                    <div className="step-title">Exportás con un clic</div>
                    <div className="step-desc">Cada vez que procesás facturas, tocás “Exportar a Google Sheets” y las filas se agregan automáticamente al final de tu hoja. Listo.</div>
                  </div>
                </div>
              </div>
              <div className="highlight">
                🕐 Esta función estará disponible muy pronto. Podés dejar guardada la URL de tu planilla en Configuración ya mismo, para que cuando esté lista quede todo configurado.
              </div>
              <button className="btn-go" onClick={() => window.location.href = '/settings'}>
                Ir a Configuración →
              </button>
            </div>
          </div>

          {/* COLUMNAS */}
          <div className={`section${active === 'columnas' ? ' visible' : ''}`}>
            <div className="card">
              <div className="card-icon">🗂️</div>
              <div className="card-title">¿Para qué sirve configurar las columnas?</div>
              <div className="card-text">
                Tu planilla de Excel probablemente tiene columnas con nombres específicos — “Razón Social”, “Importe Total”, “Fecha de compra”, etc. Si Ritto exporta con nombres distintos, tenés que mover todo a mano.<br /><br />
                Configurando las columnas, Ritto exporta con exactamente los mismos nombres que tiene tu planilla. Así pegás los datos y caen solos en el lugar correcto.
              </div>
            </div>

            <div className="card">
              <div className="card-title">Ejemplo paso a paso</div>
              <div className="card-text">Supongamos que tu planilla de Excel tiene estas columnas:</div>
              <div className="example-box" style={{ marginTop: 12 }}>
                <div className="example-label">Tu planilla de Excel</div>
                <table className="example-table">
                  <thead>
                    <tr>
                      <th>Razón Social</th>
                      <th>RUT</th>
                      <th>Fecha de compra</th>
                      <th>Importe neto</th>
                      <th>IVA</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Supermercado SA</td>
                      <td>21.234.567-8</td>
                      <td>15/07/2025</td>
                      <td>$1.200</td>
                      <td>$264</td>
                      <td>$1.464</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="steps" style={{ marginTop: 20 }}>
                <div className="step">
                  <div className="step-num">1</div>
                  <div className="step-content">
                    <div className="step-title">Andá a Configuración → Plantilla de Excel</div>
                    <div className="step-desc">Ahí ves una lista de columnas con dos campos cada una.</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">2</div>
                  <div className="step-content">
                    <div className="step-title">En “Nombre en tu planilla” escribís el nombre exacto</div>
                    <div className="step-desc">Tal cual aparece en tu Excel. Respetando mayúsculas y acentos.</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">3</div>
                  <div className="step-content">
                    <div className="step-title">En “Dato de Ritto” elegís qué información va ahí</div>
                    <div className="step-desc">Por ejemplo: “Razón Social” → Proveedor · “Importe neto” → Neto (sin IVA) · “Total” → Total</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">4</div>
                  <div className="step-content">
                    <div className="step-title">Guardás y listo</div>
                    <div className="step-desc">Todos los exportes siguientes van a tener tus columnas exactas.</div>
                  </div>
                </div>
              </div>

              <button className="btn-go" onClick={() => window.location.href = '/settings'}>
                Ir a configurar columnas →
              </button>
            </div>
          </div>

          {/* TIPS */}
          <div className={`section${active === 'tips' ? ' visible' : ''}`}>
            <div className="card">
              <div className="card-icon">🚀</div>
              <div className="card-title">Cómo sacarle el jugo a Ritto</div>
              <div className="tip-list">
                <div className="tip">
                  <div className="tip-icon">⚡</div>
                  <div className="tip-text"><strong>Usá XMLs del DGI siempre que puedas.</strong> Son instantáneos, gratuitos y exactos al 100%. Tu proveedor te los puede mandar por email.</div>
                </div>
                <div className="tip">
                  <div className="tip-icon">📦</div>
                  <div className="tip-text"><strong>Subí varias facturas a la vez.</strong> Podés arrastrar hasta 10 archivos juntos y se procesan en paralelo.</div>
                </div>
                <div className="tip">
                  <div className="tip-icon">🗓️</div>
                  <div className="tip-text"><strong>Filtrá por mes antes de exportar.</strong> Si llevás un registro mensual, elegí el mes en el filtro y exportás solo ese período.</div>
                </div>
                <div className="tip">
                  <div className="tip-icon">📸</div>
                  <div className="tip-text"><strong>Las fotos funcionan, pero mejor con buena luz.</strong> Si la factura está arrugada o en sombra, la lectura puede fallar. Intentá con el PDF cuando sea posible.</div>
                </div>
                <div className="tip">
                  <div className="tip-icon">🔁</div>
                  <div className="tip-text"><strong>Ritto detecta duplicados.</strong> Si subís la misma factura dos veces te avisa. Así no te queda nada cargado doble.</div>
                </div>
                <div className="tip">
                  <div className="tip-icon">⚙️</div>
                  <div className="tip-text"><strong>Configurá las columnas una sola vez.</strong> Una vez que las tenés bien, cada exportación va a ser perfecta sin tocar nada.</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
