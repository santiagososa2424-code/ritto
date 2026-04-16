import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';

type Section = 'primeros-pasos' | 'archivos' | 'exportar';

const SECTIONS: { id: Section; label: string; emoji: string }[] = [
  { id: 'primeros-pasos', label: 'Cómo usar Ritto', emoji: '👋' },
  { id: 'archivos', label: '¿Qué archivo tengo?', emoji: '📄' },
  { id: 'exportar', label: 'Descargar mis datos', emoji: '📥' },
];

export default function GuiaPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string | undefined>();
  const [empresa, setEmpresa] = useState<string | undefined>();
  const [active, setActive] = useState<Section>('primeros-pasos');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      setUser(data.user);
      supabase.from('profiles').select('*').eq('id', data.user.id).single().then(({ data: p }) => {
        if (!p) return;
        if (p.trial_ends_at && p.subscription_status === 'trial') {
          setTrialDaysLeft(Math.max(0, Math.ceil((new Date(p.trial_ends_at).getTime() - Date.now()) / 86400000)));
        }
        if (p.plan) setPlanName(p.plan.charAt(0).toUpperCase() + p.plan.slice(1));
        if (p.empresa) setEmpresa(p.empresa);
      });
    });
  }, [router]);

  if (!user) return null;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7;
          --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0; --white: #ffffff;
        }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page-wrap { padding: 28px 28px 80px; max-width: 780px; }
        .page-title { font-family: 'DM Serif Display', serif; font-size: 28px; margin-bottom: 4px; }
        .page-sub { font-size: 14px; color: var(--gray); margin-bottom: 28px; }

        .tabs { display: flex; gap: 8px; margin-bottom: 32px; flex-wrap: wrap; }
        .tab {
          padding: 10px 20px; border-radius: 10px; border: 1.5px solid var(--border);
          background: var(--white); font-family: 'Figtree', sans-serif;
          font-size: 14px; font-weight: 500; cursor: pointer; color: var(--gray);
          transition: all 0.15s; display: flex; align-items: center; gap: 7px;
        }
        .tab:hover { border-color: var(--green); color: var(--green); }
        .tab.active { background: var(--green); border-color: var(--green); color: #fff; font-weight: 600; }

        .card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 28px; margin-bottom: 16px; }
        .card-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
        .card-desc { font-size: 15px; color: var(--gray); line-height: 1.65; }

        .steps { display: flex; flex-direction: column; gap: 20px; margin-top: 20px; }
        .step { display: flex; gap: 16px; align-items: flex-start; }
        .step-num {
          width: 34px; height: 34px; background: var(--green); border-radius: 50%;
          color: #fff; font-size: 15px; font-weight: 700; display: flex;
          align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;
        }
        .step-body { flex: 1; }
        .step-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; color: var(--dark); }
        .step-desc { font-size: 14px; color: var(--gray); line-height: 1.6; }
        .step-tip { font-size: 13px; color: var(--green); margin-top: 6px; font-weight: 500; }

        .tip-box {
          background: var(--green-light); border: 1px solid rgba(10,124,89,0.2);
          border-radius: 12px; padding: 14px 18px; margin-top: 16px;
          font-size: 14px; color: #0a5c44; line-height: 1.6;
        }
        .warn-box {
          background: #fffbeb; border: 1px solid #fde68a;
          border-radius: 12px; padding: 14px 18px; margin-top: 12px;
          font-size: 14px; color: #78350f; line-height: 1.6;
        }

        .format-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-top: 16px; }
        .format-card { border: 1.5px solid var(--border); border-radius: 12px; padding: 18px; background: var(--white); }
        .format-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; margin-bottom: 10px; }
        .format-title { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
        .format-desc { font-size: 13px; color: var(--gray); line-height: 1.55; }
        .format-best { font-size: 12px; font-weight: 600; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border); }

        .faq-list { display: flex; flex-direction: column; gap: 12px; }
        .faq-item { border: 1px solid var(--border); border-radius: 12px; padding: 18px; background: var(--white); }
        .faq-q { font-size: 15px; font-weight: 700; margin-bottom: 6px; color: var(--dark); }
        .faq-a { font-size: 14px; color: var(--gray); line-height: 1.6; }

        .export-option { display: flex; gap: 16px; align-items: flex-start; padding: 18px; border: 1.5px solid var(--border); border-radius: 12px; margin-bottom: 12px; background: var(--white); }
        .export-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .export-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
        .export-desc { font-size: 13px; color: var(--gray); line-height: 1.55; }

        @media (max-width: 768px) {
          .page-wrap { padding: 18px 16px 80px; }
          .page-title { font-size: 22px; }
          .format-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <Sidebar active="guia" userEmail={user.email} empresa={empresa} trialDaysLeft={trialDaysLeft} planName={planName} />

      <div className="with-sidebar">
        <div className="page-wrap">
          <h1 className="page-title">Guía de uso</h1>
          <p className="page-sub">Todo lo que necesitás saber para usar Ritto, paso a paso y sin complicaciones</p>

          <div className="tabs">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`tab${active === s.id ? ' active' : ''}`}
                onClick={() => setActive(s.id)}
              >
                <span>{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>

          {/* ── PRIMEROS PASOS ── */}
          {active === 'primeros-pasos' && (
            <>
              <div className="card">
                <div className="card-title">¿Para qué sirve Ritto?</div>
                <div className="card-desc">
                  Ritto lee tus facturas automáticamente y te da los datos listos para cargar en tu sistema contable.
                  En vez de tipear a mano cada número, subís el archivo y en segundos tenés todo extraído: quién te facturó, la fecha, el IVA y el total.
                </div>
              </div>

              <div className="card">
                <div className="card-title">Paso a paso: cómo procesar una factura</div>
                <div className="steps">
                  <div className="step">
                    <div className="step-num">1</div>
                    <div className="step-body">
                      <div className="step-title">Andá a "Facturas" en el menú</div>
                      <div className="step-desc">Es la primera opción del menú lateral. Ahí vas a ver tu historial y el área para subir nuevas facturas.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num">2</div>
                    <div className="step-body">
                      <div className="step-title">Subí tu factura</div>
                      <div className="step-desc">
                        Hacé clic en el área verde o arrastrá el archivo desde tu computadora. Podés subir <strong>fotos, PDFs o archivos XML</strong>.
                        También podés subir <strong>varias a la vez</strong> — seleccioná todas juntas.
                      </div>
                      <div className="step-tip">Tip: si tenés la factura en papel, sacale una foto con el celular y mandátela a vos mismo.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num">3</div>
                    <div className="step-body">
                      <div className="step-title">Esperá unos segundos</div>
                      <div className="step-desc">
                        Vas a ver "procesando…" mientras Ritto lee la factura. En general tarda entre 3 y 15 segundos según el tipo de archivo.
                        Los archivos XML son instantáneos.
                      </div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num">4</div>
                    <div className="step-body">
                      <div className="step-title">Revisá los datos y descargá</div>
                      <div className="step-desc">
                        Cuando aparece <strong>"Listo"</strong>, los datos están extraídos. Podés descargar el archivo con el botón <strong>XLS</strong> (Excel) o <strong>CSV</strong>.
                        El CSV abre en Google Sheets si no tenés Excel instalado.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Preguntas frecuentes</div>
                <div className="faq-list" style={{ marginTop: 8 }}>
                  {[
                    {
                      q: '¿Puedo subir varias facturas a la vez?',
                      a: 'Sí, hasta 10 a la vez. Seleccionás todos los archivos juntos al mismo tiempo y se procesan en paralelo.',
                    },
                    {
                      q: '¿Los datos se guardan?',
                      a: 'Sí. Todo el historial queda guardado en tu cuenta. Podés filtrar por mes y volver a descargar cualquier factura cuando quieras.',
                    },
                    {
                      q: '¿Qué hago si la extracción salió mal?',
                      a: 'Si algún número no está bien, revisá que la foto o PDF sea legible y sin partes cortadas. Con el XML siempre va a ser exacto.',
                    },
                    {
                      q: '¿Puedo borrar una factura?',
                      a: 'Sí, con el botón "×" al final de cada fila. Te va a pedir confirmación antes de borrar.',
                    },
                    {
                      q: '¿Puedo buscar facturas de un mes específico?',
                      a: 'Sí. Arriba a la derecha de la tabla tenés un filtro por fecha donde elegís el mes que querés ver.',
                    },
                  ].map((f) => (
                    <div className="faq-item" key={f.q}>
                      <div className="faq-q">{f.q}</div>
                      <div className="faq-a">{f.a}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── TIPOS DE ARCHIVO ── */}
          {active === 'archivos' && (
            <>
              <div className="card">
                <div className="card-title">¿Qué tipo de archivo puedo subir?</div>
                <div className="card-desc">Ritto acepta tres tipos de archivo. Usá el que tengas disponible — todos funcionan.</div>
                <div className="format-grid">
                  <div className="format-card">
                    <span className="format-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>XML</span>
                    <div className="format-title">Archivo XML</div>
                    <div className="format-desc">
                      Es el formato oficial de DGI Uruguay. Tu proveedor lo adjunta al email de la factura electrónica. Es un archivo de texto con extensión <strong>.xml</strong>.
                    </div>
                    <div className="format-best" style={{ color: '#0a7c59' }}>Mejor opción — extracción instantánea y 100% exacta</div>
                  </div>
                  <div className="format-card">
                    <span className="format-badge" style={{ background: '#fef3c7', color: '#92400e' }}>PDF</span>
                    <div className="format-title">Archivo PDF</div>
                    <div className="format-desc">
                      Si tu proveedor te manda la factura en PDF, subís ese archivo directamente. Ritto usa inteligencia artificial para leer el contenido.
                    </div>
                    <div className="format-best" style={{ color: '#6b7280' }}>Buena opción — tarda 5-15 segundos, muy preciso</div>
                  </div>
                  <div className="format-card">
                    <span className="format-badge" style={{ background: '#f3e8ff', color: '#6b21a8' }}>Foto</span>
                    <div className="format-title">Foto (JPG / PNG)</div>
                    <div className="format-desc">
                      Si tenés la factura en papel, sacale una foto con el celular. Mandátela a vos mismo por WhatsApp o email y descargá la foto.
                    </div>
                    <div className="format-best" style={{ color: '#6b7280' }}>Funciona bien si la foto es clara y completa</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">¿Dónde encuentro el archivo XML?</div>
                <div className="steps">
                  <div className="step">
                    <div className="step-num">A</div>
                    <div className="step-body">
                      <div className="step-title">En el email del proveedor</div>
                      <div className="step-desc">Cuando una empresa te manda una factura electrónica, casi siempre viene con el XML adjunto en el correo. Buscá el archivo adjunto con extensión <strong>.xml</strong>.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num">B</div>
                    <div className="step-body">
                      <div className="step-title">Desde el portal de DGI</div>
                      <div className="step-desc">Entrás a <strong>servicios.dgi.gub.uy</strong> con tu usuario empresa, vas a Consulta de CFE recibidos y podés descargar el XML de cualquier factura.</div>
                    </div>
                  </div>
                </div>
                <div className="tip-box">
                  Si no tenés el XML, no hay problema. El PDF o la foto también funcionan muy bien.
                </div>
              </div>

              <div className="card">
                <div className="card-title">Consejos para mejores resultados con fotos</div>
                <div className="steps">
                  <div className="step">
                    <div className="step-num">1</div>
                    <div className="step-body">
                      <div className="step-title">Que se vea todo el documento</div>
                      <div className="step-desc">No recortes los bordes. Tiene que verse completo, incluyendo el encabezado con el nombre del proveedor y el pie con el total.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num">2</div>
                    <div className="step-body">
                      <div className="step-title">Buena iluminación, sin sombras</div>
                      <div className="step-desc">Ponés la factura en una superficie plana, con buena luz. Evitá que tu mano o el celular tiren sombra sobre el texto.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num">3</div>
                    <div className="step-body">
                      <div className="step-title">Foto derecha, sin ángulos</div>
                      <div className="step-desc">Tomá la foto de frente, no en diagonal. Cuanto más derecho mejor para que el sistema pueda leer los números.</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── EXPORTAR ── */}
          {active === 'exportar' && (
            <>
              <div className="card">
                <div className="card-title">¿Cómo descargo mis facturas?</div>
                <div className="card-desc">
                  Una vez que una factura dice <strong>"Listo"</strong>, podés descargar los datos en dos formatos.
                  Si tenés Excel instalado usá el XLS. Si no, usá el CSV que abre en Google Sheets (gratis).
                </div>
                <div style={{ marginTop: 20 }}>
                  <div className="export-option">
                    <div className="export-icon" style={{ background: '#e6f4ef' }}>📊</div>
                    <div>
                      <div className="export-title">XLS (Excel)</div>
                      <div className="export-desc">
                        El botón <strong>XLS</strong> al lado de cada factura descarga esa factura sola.<br />
                        El botón <strong>Exportar XLS</strong> arriba descarga todas las facturas que tenés en pantalla de una vez.<br />
                        Abrís el archivo con Excel y lo importás a tu sistema contable.
                      </div>
                    </div>
                  </div>
                  <div className="export-option">
                    <div className="export-icon" style={{ background: '#f0f0f0' }}>📋</div>
                    <div>
                      <div className="export-title">CSV (Google Sheets y más)</div>
                      <div className="export-desc">
                        El botón <strong>CSV</strong> descarga el mismo contenido pero en un formato que abre en cualquier programa.<br />
                        Si no tenés Excel, abrís <strong>sheets.google.com</strong>, hacés clic en el símbolo "+" y subís el archivo CSV. Gratis y sin instalar nada.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">¿Cómo importo el archivo en mi sistema contable?</div>
                <div className="steps">
                  <div className="step">
                    <div className="step-num" style={{ background: '#1d4ed8' }}>G</div>
                    <div className="step-body">
                      <div className="step-title">GNS Contable</div>
                      <div className="step-desc">Andá a <strong>Importaciones → Comprobantes de Compra → Importar Excel</strong> y seleccioná el archivo descargado de Ritto.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num" style={{ background: '#f59e0b' }}>Z</div>
                    <div className="step-body">
                      <div className="step-title">ZetaSoftware</div>
                      <div className="step-desc">Andá a <strong>Compras → Importar comprobantes → Desde Excel</strong> y seleccioná el archivo. Si las facturas son en dólares, revisá la columna "Cotización" antes de importar.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num" style={{ background: '#16a34a' }}>S</div>
                    <div className="step-body">
                      <div className="step-title">Siigo</div>
                      <div className="step-desc">Andá a <strong>Compras → Importación de comprobantes → Cargar plantilla</strong> y seleccioná el archivo descargado de Ritto.</div>
                    </div>
                  </div>
                </div>
                <div className="tip-box">
                  ¿No usás ninguno de estos sistemas? Igual podés usar el CSV — abrís el archivo en Excel o Google Sheets y copiás los datos que necesitás.
                </div>
              </div>

              <div className="card">
                <div className="card-title">¿Qué datos trae el archivo?</div>
                <div className="card-desc" style={{ marginBottom: 16 }}>
                  Cada fila del archivo es un producto o servicio de la factura. Las columnas incluyen:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Proveedor', 'Tipo de factura', 'Fecha', 'Número', 'Código del producto', 'Descripción', 'Cantidad', 'Moneda', 'Precio unitario', 'Descuento', 'Subtotal sin IVA', 'IVA', 'Total con IVA'].map((col) => (
                    <span key={col} style={{ background: '#f0f0f2', borderRadius: 6, padding: '4px 10px', fontSize: 13, color: '#555' }}>{col}</span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
