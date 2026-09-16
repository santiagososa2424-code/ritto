import { useState } from 'react';
import { useRouter } from 'next/router';
import Sidebar from '../components/Sidebar';
import { SOPORTE_TEL } from '../lib/soporte';

// Google Sheets es el camino, no una opción entre dos. La guía trataba Excel y Sheets
// como equivalentes y toda la configuración estaba escrita alrededor de plantillas de
// Excel, que es de la época anterior: hoy Ritto lee las columnas de tu planilla solo.
// La primera usuaria de verdad se trabó justo acá.
const sections = [
  { id: 'empezar', label: 'Cómo empezar' },
  { id: 'sheets', label: 'Conectar tu planilla' },
  { id: 'columnas', label: 'Cómo lee tus columnas' },
  { id: 'tips', label: 'Sacarle el jugo' },
  { id: 'problemas', label: 'Problemas frecuentes' },
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
          border-radius: 10px; padding: 14px 16px; margin-top: 12px;
        }
        .example-label { font-size: 11px; font-weight: 700; color: var(--green); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
        .example-table { width: 100%; border-collapse: collapse; font-size: 13px; }
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

          <div className={`section${active === 'empezar' ? ' visible' : ''}`}>
            <div className="card">
              <div className="card-icon">📄</div>
              <div className="card-title">¿Qué hace Ritto?</div>
              <div className="card-text">
                Subís tus facturas (foto, PDF o XML) y Ritto lee automáticamente los datos — proveedor, fecha, monto, IVA — y los escribe en tu Google Sheets: en la pestaña del proveedor, en la fila que va por fecha, sin romper las fórmulas que ya tenías.
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
                    <div className="step-title">Exportá a tu planilla</div>
                    <div className="step-desc">Cuando tenés las facturas que querés, tocá "Exportar a Google Sheets" arriba a la derecha. Las filas aparecen solas en tu planilla, en la pestaña del proveedor y en el lugar que les toca por fecha.</div>
                  </div>
                </div>
              </div>
              <div className="highlight">
                💡 <strong>El mejor tipo de archivo:</strong> los XML del DGI son instantáneos y 100% exactos. Si tu proveedor te los manda, usá esos primero.
                <br /><br />
                También podés bajarte un archivo Excel con el botón <strong>XLS</strong>, por si necesitás mandarle los datos a alguien. Pero el camino de Ritto es Google Sheets: es el único que escribe adentro de tu planilla sin que tengas que copiar y pegar nada.
              </div>
            </div>
          </div>

          <div className={`section${active === 'sheets' ? ' visible' : ''}`}>
            <div className="card">
              <div className="card-icon">🟢</div>
              <div className="card-title">Conectar Google Sheets</div>
              <div className="card-text">
                Exportás desde Ritto y las filas aparecen solas en tu planilla. No hay que descargar ni copiar nada.
              </div>
              <div className="highlight">
                🔒 <strong>Ritto está verificada por Google.</strong> Cuando conectes vas a ver la pantalla
                de permisos de siempre, sin advertencias. El único permiso que pide es editar planillas de
                Google Sheets: no puede ver tu Gmail, tus fotos ni el resto de tu Drive.
                <br /><br />
                Podés cortarle el acceso cuando quieras desde Configuración, o desde tu cuenta de Google.
              </div>
              <div className="steps" style={{ marginTop: 16 }}>
                <div className="step">
                  <div className="step-num">1</div>
                  <div className="step-content">
                    <div className="step-title">Connectás tu cuenta de Google</div>
                    <div className="step-desc">En Configuración, tocás "Conectar con Google" y le das permiso a Ritto para escribir en tu planilla. Ritto solo puede escribir en Sheets — no puede ver ni modificar tus otros archivos.</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">2</div>
                  <div className="step-content">
                    <div className="step-title">Pegás el link de tu planilla</div>
                    <div className="step-desc">Abrís tu Google Sheets, copiás la URL completa de la barra del navegador y la pegás en el campo "URL de tu Google Sheet" en Configuración. Guardás.</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">3</div>
                  <div className="step-content">
                    <div className="step-title">Ritto lee tu planilla</div>
                    <div className="step-desc">En Configuración tocás "Leer mi planilla y ver columnas". Ritto abre tu Sheet, detecta las pestañas y los nombres de tus columnas, y te los muestra para que le digas qué dato va en cada una. Es opcional, pero es lo que hace que los datos caigan justo donde los esperás.</div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">4</div>
                  <div className="step-content">
                    <div className="step-title">Exportás con un clic</div>
                    <div className="step-desc">Procesás tus facturas, tocás "Exportar a Google Sheets" y los datos se agregan solos. No tenés que abrir la planilla para nada.</div>
                  </div>
                </div>
              </div>
              <div className="highlight">
                💡 <strong>Si tu planilla tiene una pestaña por proveedor</strong> (ej: una pestaña "FINESA", otra "MALMO"), Ritto detecta el proveedor de cada factura y escribe en la pestaña correcta automáticamente. Si no encuentra la pestaña, la factura va a una hoja llamada "Ritto - Sin clasificar".
              </div>
              <button className="btn-go" onClick={() => window.location.href = '/settings'}>
                Ir a Configuración →
              </button>
            </div>
          </div>

          <div className={`section${active === 'columnas' ? ' visible' : ''}`}>
            <div className="card">
              <div className="card-icon">🗂️</div>
              <div className="card-title">¿Para qué sirve configurar las columnas?</div>
              <div className="card-text">
                No hace falta que configures nada. Ritto abre tu planilla, lee los nombres de tus columnas y
                mira lo que ya tenés cargado para deducir qué va en cada una: si una columna viene llena de
                fechas es la de fechas, aunque le hayas puesto "Día" o "Emisión".<br /><br />
                Lo que <strong>nunca</strong> toca: las columnas que calcula tu planilla. Si una celda tiene una
                fórmula, Ritto la deja como está. Los totales, las deudas y los acumulados siguen siendo
                tuyos.<br /><br />
                Esta sección es para cuando Ritto se equivoca y querés corregirlo a mano.
              </div>
            </div>

            <div className="card">
              <div className="card-title">Cuando Ritto no encuentra dónde escribir</div>
              <div className="card-text">
                A veces te va a avisar que leyó el importe pero no supo en qué columna ponerlo, o que no
                encontró la pestaña de un proveedor. Cuando eso pasa te lo dice en pantalla y te deja
                arreglarlo ahí mismo, sin tocar nada de la planilla:
              </div>
              <div className="steps" style={{ marginTop: 16 }}>
                <div className="step">
                  <div className="step-num">1</div>
                  <div className="step-content">
                    <div className="step-title">«No encontramos la pestaña de este proveedor»</div>
                    <div className="step-desc">
                      Elegís de la lista a cuál mandarla y tocás «Enviar y recordar». Ritto se lo guarda por
                      el RUT del proveedor, así que la próxima factura va sola —aunque el nombre venga
                      escrito distinto—.
                    </div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">2</div>
                  <div className="step-content">
                    <div className="step-title">«Esta columna tiene fórmulas»</div>
                    <div className="step-desc">
                      Ritto no pisa una celda calculada. Si igual querés que escriba ahí, tocás «Escribir
                      igual acá» y lo recuerda para las próximas.
                    </div>
                  </div>
                </div>
                <div className="step">
                  <div className="step-num">3</div>
                  <div className="step-content">
                    <div className="step-title">Un dato quedó mal leído</div>
                    <div className="step-desc">
                      En la lista de facturas tocás el lápiz ✏ y lo corregís antes de exportar.
                    </div>
                  </div>
                </div>
              </div>
              <div className="highlight">
                💡 <strong>Si tu planilla tiene una columna «Moneda»</strong>, Ritto escribe ahí si la factura
                está en pesos o en dólares. Si no la tiene y la factura viene en dólares, te avisa —para que
                el importe no quede mezclado con los que están en pesos sin que nadie se dé cuenta—.
              </div>
              <button className="btn-go" onClick={() => window.location.href = '/settings'}>
                Ver cómo Ritto entiende mi planilla →
              </button>
            </div>
          </div>

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

          <div className={`section${active === 'problemas' ? ' visible' : ''}`}>
            <div className="card">
              <div className="card-icon">🔴</div>
              <div className="card-title">No puedo conectar mi cuenta de Google</div>
              <div className="card-text">
                Ritto está verificada por Google, así que no deberías ver ninguna advertencia. Si te
                aparece un error al conectar, suele ser que la cuenta de Google que elegiste no es la
                dueña de la planilla: fijate de elegir la misma con la que abrís tu Google Sheets. Si
                sigue sin andar, <strong>escribinos por WhatsApp al {SOPORTE_TEL}</strong> con tu email de
                Google y lo vemos.
              </div>
            </div>

            <div className="card">
              <div className="card-icon">⚠️</div>
              <div className="card-title">La factura se procesó pero los datos están mal</div>
              <div className="card-text">
                Pasa cuando la imagen está borrosa, con poca luz, o el PDF tiene texto como imagen (escaneado). Podés corregir los datos manualmente tocando el ícono ✏️ al lado de la factura. Para evitarlo: usá XMLs del DGI cuando sea posible, o PDFs digitales en lugar de fotos.
              </div>
            </div>

            <div className="card">
              <div className="card-icon">🔁</div>
              <div className="card-title">Error al exportar a Google Sheets</div>
              <div className="card-text">
                Si aparece un error al exportar, verificá:
              </div>
              <div className="tip-list" style={{ marginTop: 12 }}>
                <div className="tip">
                  <div className="tip-icon">1️⃣</div>
                  <div className="tip-text">Que hayas conectado tu cuenta de Google en Configuración (aparece el chip "Conectado").</div>
                </div>
                <div className="tip">
                  <div className="tip-icon">2️⃣</div>
                  <div className="tip-text">Que hayas guardado la URL de tu planilla en Configuración. Tiene que ser la URL completa, no solo el ID.</div>
                </div>
                <div className="tip">
                  <div className="tip-icon">3️⃣</div>
                  <div className="tip-text">Que la planilla sea tuya o que te hayan dado permiso de edición. Ritto no puede escribir en planillas de solo lectura.</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-icon">📋</div>
              <div className="card-title">Los datos no caen en las columnas que esperaba</div>
              <div className="card-text">
                En Configuración tocá «Leer mi planilla y ver columnas»: Ritto te muestra pestaña por pestaña
                cómo entendió cada una de tus columnas. Si alguna la interpretó mal, ahí mismo le decís qué
                dato va en cada una.
              </div>
              <button className="btn-go" onClick={() => window.location.href = '/settings'}>
                Ir a configurar columnas →
              </button>
            </div>

            <div className="card">
              <div className="card-icon">📧</div>
              <div className="card-title">¿Otro problema?</div>
              <div className="card-text">
                Escribinos por WhatsApp al <strong>{SOPORTE_TEL}</strong> con una descripción del problema y,
                si podés, una captura de pantalla. Respondemos rápido.
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
