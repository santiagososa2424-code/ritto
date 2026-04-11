import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';

type Section = 'archivos' | 'comprobantes' | 'exportar';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'archivos', label: 'Tipos de archivo' },
  { id: 'comprobantes', label: 'Comprobantes CFE' },
  { id: 'exportar', label: 'Exportar a tu sistema' },
];

export default function GuiaPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string | undefined>();
  const [active, setActive] = useState<Section>('archivos');

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
          --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0;
          --white: #ffffff;
        }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page-wrap { padding: 28px 28px 80px; max-width: 860px; }
        .page-title { font-family: 'DM Serif Display', serif; font-size: 28px; margin-bottom: 4px; }
        .page-sub { font-size: 13px; color: var(--gray); margin-bottom: 28px; }

        /* Section tabs */
        .tabs { display: flex; gap: 6px; margin-bottom: 28px; flex-wrap: wrap; }
        .tab {
          padding: 8px 18px; border-radius: 8px; border: 1.5px solid var(--border);
          background: var(--white); font-family: 'Figtree', sans-serif;
          font-size: 13px; font-weight: 500; cursor: pointer; color: var(--gray);
          transition: all 0.15s;
        }
        .tab:hover { border-color: var(--green); color: var(--green); }
        .tab.active { background: var(--green); border-color: var(--green); color: #fff; font-weight: 600; }

        /* Cards */
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 24px; margin-bottom: 16px; }
        .card-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
        .card-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .card-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .card-desc { font-size: 13px; color: var(--gray); line-height: 1.55; }

        .badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 700; margin-right: 6px; margin-bottom: 6px; }
        .badge-green { background: var(--green-light); color: var(--green); }
        .badge-blue { background: #eff6ff; color: #1d4ed8; }
        .badge-amber { background: #fffbeb; color: #92400e; }
        .badge-purple { background: #f3e8ff; color: #6b21a8; }
        .badge-red { background: #fef2f2; color: #dc2626; }

        .steps { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
        .step { display: flex; gap: 14px; align-items: flex-start; }
        .step-num { width: 28px; height: 28px; background: var(--green); border-radius: 50%; color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .step-content { flex: 1; }
        .step-title { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
        .step-desc { font-size: 13px; color: var(--gray); line-height: 1.5; }

        .tip-box { background: var(--green-light); border: 1px solid rgba(10,124,89,0.2); border-radius: 10px; padding: 12px 16px; margin-top: 16px; font-size: 13px; color: #0a5c44; line-height: 1.55; }
        .warn-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 16px; margin-top: 12px; font-size: 13px; color: #78350f; line-height: 1.55; }

        /* File type illustration */
        .file-ill { background: var(--bg); border: 1.5px dashed var(--border); border-radius: 10px; padding: 16px; margin-top: 14px; display: flex; align-items: center; gap: 12px; }
        .file-ill-icon { flex-shrink: 0; }
        .file-ill-text { font-size: 12px; color: var(--gray); line-height: 1.6; }
        .file-ill-text strong { color: var(--dark); font-size: 13px; display: block; margin-bottom: 2px; }

        /* Columns table */
        .col-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 14px; }
        .col-table th { text-align: left; padding: 8px 10px; background: #fafafa; border: 1px solid var(--border); font-size: 11px; font-weight: 600; color: var(--gray); text-transform: uppercase; letter-spacing: 0.4px; }
        .col-table td { padding: 8px 10px; border: 1px solid var(--border); color: var(--dark); vertical-align: top; }
        .col-table tr:nth-child(even) td { background: #fafafa; }

        /* CFE diagram */
        .cfe-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
        .cfe-item { border: 1px solid var(--border); border-radius: 10px; padding: 14px; background: var(--white); }
        .cfe-type { font-size: 11px; font-weight: 700; color: var(--green); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .cfe-name { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
        .cfe-desc { font-size: 12px; color: var(--gray); line-height: 1.5; }
        .cfe-uso { font-size: 11px; color: var(--gray); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--bg); }
        .cfe-uso strong { color: var(--dark); }

        @media (max-width: 768px) {
          .page-wrap { padding: 18px 16px 80px; }
          .page-title { font-size: 22px; }
          .cfe-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <Sidebar active="guia" userEmail={user.email} trialDaysLeft={trialDaysLeft} planName={planName} />

      <div className="with-sidebar">
        <div className="page-wrap">
          <h1 className="page-title">Guía de uso</h1>
          <p className="page-sub">Todo lo que necesitás saber para usar Ritto correctamente</p>

          <div className="tabs">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`tab${active === s.id ? ' active' : ''}`}
                onClick={() => setActive(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* ── TIPOS DE ARCHIVO ── */}
          {active === 'archivos' && (
            <>
              <div className="card">
                <div className="card-header">
                  <div className="card-icon" style={{ background: '#eff6ff' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                    </svg>
                  </div>
                  <div>
                    <div className="card-title">XML · Comprobante Fiscal Electrónico (CFE)</div>
                    <div className="card-desc">El formato nativo de DGI Uruguay. Extracción instantánea, 100% precisa, sin usar inteligencia artificial.</div>
                  </div>
                </div>
                <div><span className="badge badge-green">Recomendado</span><span className="badge badge-green">Más rápido</span><span className="badge badge-green">Sin errores</span></div>
                <div className="steps">
                  <div className="step">
                    <div className="step-num">1</div>
                    <div className="step-content">
                      <div className="step-title">¿Cómo conseguir el XML?</div>
                      <div className="step-desc">Tu proveedor lo adjunta al email de la factura electrónica, o podés descargarlo desde el portal de DGI con tu usuario empresa. El archivo tiene extensión <strong>.xml</strong>.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num">2</div>
                    <div className="step-content">
                      <div className="step-title">Subilo a Ritto</div>
                      <div className="step-desc">Arrastrá el archivo .xml al área de carga o hacé clic para seleccionarlo. Podés subir varios a la vez.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num">3</div>
                    <div className="step-content">
                      <div className="step-title">Listo instantáneamente</div>
                      <div className="step-desc">Ritto lee el XML directamente — sin IA — y extrae todos los datos en milisegundos: proveedor, RUT, fecha, ítems, IVA y total.</div>
                    </div>
                  </div>
                </div>
                <div className="file-ill">
                  <div className="file-ill-icon">
                    <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
                      <rect x="1" y="1" width="34" height="42" rx="4" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1.5"/>
                      <text x="18" y="18" textAnchor="middle" fontSize="8" fill="#1d4ed8" fontFamily="monospace" fontWeight="700">XML</text>
                      <text x="8" y="27" fontSize="5.5" fill="#93c5fd" fontFamily="monospace">&lt;CFE&gt;</text>
                      <text x="10" y="33" fontSize="5.5" fill="#93c5fd" fontFamily="monospace">&lt;Enc/&gt;</text>
                      <text x="8" y="39" fontSize="5.5" fill="#93c5fd" fontFamily="monospace">&lt;/CFE&gt;</text>
                    </svg>
                  </div>
                  <div className="file-ill-text">
                    <strong>factura_proveedor_2025.xml</strong>
                    Contiene la estructura completa del CFE: encabezado, emisor, totales y detalle de ítems. Es el archivo oficial firmado digitalmente por DGI.
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-icon" style={{ background: '#fef3c7' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div>
                    <div className="card-title">PDF</div>
                    <div className="card-desc">Facturas en formato PDF procesadas con inteligencia artificial (Gemini). Alta precisión cuando el documento es legible.</div>
                  </div>
                </div>
                <div><span className="badge badge-amber">IA requerida</span><span className="badge badge-amber">~95% precisión</span></div>
                <div className="steps">
                  <div className="step">
                    <div className="step-num">1</div>
                    <div className="step-content">
                      <div className="step-title">Subí el PDF</div>
                      <div className="step-desc">Arrastrá o seleccioná el archivo .pdf. Tamaño máximo: 20 MB.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num">2</div>
                    <div className="step-content">
                      <div className="step-title">Ritto lo procesa con IA</div>
                      <div className="step-desc">Gemini lee el contenido del PDF y extrae los datos fiscales. El proceso tarda entre 5 y 20 segundos según el tamaño.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num">3</div>
                    <div className="step-content">
                      <div className="step-title">Revisá los datos extraídos</div>
                      <div className="step-desc">Verificá en la tabla que los montos y el RUT sean correctos antes de exportar, especialmente en facturas con formatos poco convencionales.</div>
                    </div>
                  </div>
                </div>
                <div className="tip-box">
                  <strong>Tip:</strong> Los mejores resultados son con PDFs generados digitalmente (no escaneados). Si el PDF es una foto/scan, la precisión puede bajar.
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-icon" style={{ background: '#f3e8ff' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b21a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                    </svg>
                  </div>
                  <div>
                    <div className="card-title">Imagen (JPG / PNG / WEBP)</div>
                    <div className="card-desc">Fotos de facturas físicas o capturas de pantalla. Útil cuando no tenés el PDF original.</div>
                  </div>
                </div>
                <div><span className="badge badge-purple">IA requerida</span><span className="badge badge-purple">Varía según calidad</span></div>
                <div className="steps">
                  <div className="step">
                    <div className="step-num">1</div>
                    <div className="step-content">
                      <div className="step-title">Sacá una buena foto</div>
                      <div className="step-desc">La factura debe verse completa, sin sombras ni partes cortadas. Mejor iluminación = mejor extracción.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num">2</div>
                    <div className="step-content">
                      <div className="step-title">Subí la imagen</div>
                      <div className="step-desc">Formatos aceptados: JPG, PNG, WEBP. El sistema la envía a Gemini para lectura óptica.</div>
                    </div>
                  </div>
                </div>
                <div className="warn-box">
                  <strong>Importante:</strong> Las imágenes borrosas, con texto cortado o con mucho ruido de fondo pueden generar datos incorrectos. Siempre preferí XML o PDF cuando estén disponibles.
                </div>
              </div>
            </>
          )}

          {/* ── COMPROBANTES CFE ── */}
          {active === 'comprobantes' && (
            <>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 8 }}>¿Qué es un CFE?</div>
                <div className="card-desc">
                  Un <strong>Comprobante Fiscal Electrónico (CFE)</strong> es el documento tributario oficial en Uruguay, emitido y validado por DGI. Cada tipo tiene un número de tres dígitos que lo identifica. Ritto reconoce y procesa todos los tipos activos.
                </div>
                <div className="tip-box" style={{ marginTop: 12 }}>
                  El número de tipo CFE aparece en el XML como <code style={{ background: 'rgba(10,92,68,0.12)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>&lt;TipoCFE&gt;101&lt;/TipoCFE&gt;</code>
                </div>
              </div>

              <div className="cfe-grid">
                <div className="cfe-item">
                  <div className="cfe-type">Tipo 101</div>
                  <div className="cfe-name">e-Factura</div>
                  <div className="cfe-desc">Comprobante estándar entre empresas (B2B). Identifica al comprador por RUT. Es el más común en compras a proveedores.</div>
                  <div className="cfe-uso"><strong>Usás para:</strong> Compras a proveedores registrados en DGI. Genera crédito fiscal de IVA.</div>
                </div>
                <div className="cfe-item">
                  <div className="cfe-type">Tipo 201</div>
                  <div className="cfe-name">e-Ticket</div>
                  <div className="cfe-desc">Para ventas a consumidor final, sin identificar al comprador. Equivale al ticket de caja electrónico.</div>
                  <div className="cfe-uso"><strong>Usás para:</strong> Compras en comercios. No genera crédito fiscal de IVA.</div>
                </div>
                <div className="cfe-item">
                  <div className="cfe-type">Tipo 102</div>
                  <div className="cfe-name">e-Factura Exportación</div>
                  <div className="cfe-desc">Factura para operaciones de exportación. Los montos suelen estar en USD y el IVA es 0% (exonerado).</div>
                  <div className="cfe-uso"><strong>Usás para:</strong> Compras/ventas al exterior.</div>
                </div>
                <div className="cfe-item">
                  <div className="cfe-type">Tipo 181</div>
                  <div className="cfe-name">e-Remito</div>
                  <div className="cfe-desc">Documento de traslado de mercadería. <strong>No es una factura</strong> — no tiene montos fiscales. Acompaña la mercadería en tránsito.</div>
                  <div className="cfe-uso"><strong>Usás para:</strong> Registrar movimientos de stock, no gastos. No deducible.</div>
                </div>
                <div className="cfe-item">
                  <div className="cfe-type">Tipo 111</div>
                  <div className="cfe-name">e-Boleta Honorarios</div>
                  <div className="cfe-desc">Emitida por profesionales independientes (médicos, abogados, contadores). Tiene retención de IRPF.</div>
                  <div className="cfe-uso"><strong>Usás para:</strong> Pagos a profesionales. Considerar la retención al contabilizar.</div>
                </div>
                <div className="cfe-item">
                  <div className="cfe-type">Tipo 301</div>
                  <div className="cfe-name">e-Factura Crédito Exportación</div>
                  <div className="cfe-desc">Nota de crédito asociada a una e-Factura de Exportación. Ajusta o anula una factura de exportación previa.</div>
                  <div className="cfe-uso"><strong>Usás para:</strong> Correcciones en operaciones de exportación.</div>
                </div>
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-title" style={{ marginBottom: 12 }}>IVA en Uruguay</div>
                <div className="card-desc" style={{ marginBottom: 12 }}>Uruguay tiene tres tasas de IVA que Ritto detecta automáticamente:</div>
                <div className="steps">
                  <div className="step">
                    <div className="step-num" style={{ background: '#1d4ed8' }}>22%</div>
                    <div className="step-content">
                      <div className="step-title">IVA Básico (tasa general)</div>
                      <div className="step-desc">Aplica a la mayoría de bienes y servicios: ropa, electrónica, servicios profesionales, etc.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num" style={{ background: '#0891b2' }}>10%</div>
                    <div className="step-content">
                      <div className="step-title">IVA Mínimo (tasa reducida)</div>
                      <div className="step-desc">Alimentos de canasta básica, medicamentos, servicios agropecuarios, y algunos servicios de salud.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num" style={{ background: '#6b7280' }}>0%</div>
                    <div className="step-content">
                      <div className="step-title">Exonerado</div>
                      <div className="step-desc">Exportaciones, arrendamientos de inmuebles, ciertos servicios educativos y de salud.</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── EXPORTAR A SISTEMA ── */}
          {active === 'exportar' && (
            <>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 8 }}>¿Cómo funciona la exportación?</div>
                <div className="card-desc">
                  Ritto genera un archivo Excel (.xlsx) con el formato exacto que requiere tu sistema contable. Configurás tu sistema en <strong>Configuración</strong> y el Excel se genera con las columnas, formatos de fecha y estructura que necesita cada sistema para importarlo directamente.
                </div>
                <div className="steps" style={{ marginTop: 16 }}>
                  <div className="step">
                    <div className="step-num">1</div>
                    <div className="step-content">
                      <div className="step-title">Procesá tus facturas</div>
                      <div className="step-desc">Subí los archivos y esperá que queden en estado "Listo".</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num">2</div>
                    <div className="step-content">
                      <div className="step-title">Exportá a Excel</div>
                      <div className="step-desc">Clic en "Exportar todas" (descarga todas las listas) o en el botón "XLS" de cada fila para descargar una sola factura.</div>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-num">3</div>
                    <div className="step-content">
                      <div className="step-title">Importá en tu sistema</div>
                      <div className="step-desc">Abrí el Excel descargado e importalo desde tu sistema contable usando la función de importación de comprobantes.</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-icon" style={{ background: '#e0f2fe' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                    </svg>
                  </div>
                  <div>
                    <div className="card-title">GNS Contable</div>
                    <div className="card-desc">Exportación con 13 columnas, una fila por ítem de la factura. Compatible con el módulo de importación de comprobantes.</div>
                  </div>
                </div>
                <table className="col-table">
                  <thead>
                    <tr><th>#</th><th>Columna</th><th>Descripción</th></tr>
                  </thead>
                  <tbody>
                    {[
                      ['A', 'Proveedor', 'Nombre del emisor de la factura'],
                      ['B', 'Tipo Comprobante', 'e-Factura, e-Ticket, etc.'],
                      ['C', 'Fecha', 'Fecha de emisión (YYYY-MM-DD)'],
                      ['D', 'Número', 'Número de documento (ej: A-0001234)'],
                      ['E', 'Código', 'Código del artículo o producto'],
                      ['F', 'Descripción', 'Descripción del ítem'],
                      ['G', 'Cantidad', 'Unidades del ítem'],
                      ['H', 'Moneda', 'UYU o USD'],
                      ['I', 'Precio Unitario', 'Precio sin impuesto por unidad'],
                      ['J', 'Descuento %', 'Porcentaje de descuento'],
                      ['K', 'Sub Total', 'Monto sin IVA'],
                      ['L', 'Impuestos', 'Monto de IVA del ítem'],
                      ['M', 'Total', 'Monto total del ítem con IVA'],
                    ].map(([col, name, desc]) => (
                      <tr key={col}><td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{col}</td><td style={{ fontWeight: 600 }}>{name}</td><td style={{ color: 'var(--gray)' }}>{desc}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="tip-box">
                  En GNS: ir a <strong>Importaciones → Comprobantes de Compra → Importar Excel</strong> y seleccioná el archivo descargado.
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-icon" style={{ background: '#fef3c7' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                    </svg>
                  </div>
                  <div>
                    <div className="card-title">ZetaSoftware</div>
                    <div className="card-desc">Exportación con 16 columnas. La fecha va en formato YYYYMMDD (requerido por Zeta). Incluye Cotización y Condición de Pago.</div>
                  </div>
                </div>
                <table className="col-table">
                  <thead>
                    <tr><th>#</th><th>Columna</th><th>Descripción</th></tr>
                  </thead>
                  <tbody>
                    {[
                      ['A', 'Proveedor', 'Nombre del emisor'],
                      ['B', 'RUT', 'RUT del emisor (XX.XXX.XXX-X)'],
                      ['C', 'Tipo Comprobante', 'e-Factura, e-Ticket, etc.'],
                      ['D', 'Número', 'Número de documento'],
                      ['E', 'Fecha', 'Formato YYYYMMDD (ej: 20250411)'],
                      ['F', 'Moneda', 'UYU o USD'],
                      ['G', 'Cotización', '1 (tipo de cambio, editar si es USD)'],
                      ['H', 'Condición Pago', '"Contado" por defecto'],
                      ['I', 'Código', 'Código del artículo'],
                      ['J', 'Descripción', 'Descripción del ítem'],
                      ['K', 'Cantidad', 'Unidades'],
                      ['L', 'Precio Unitario', 'Sin IVA'],
                      ['M', 'Descuento %', 'Porcentaje de descuento'],
                      ['N', 'IVA %', 'Tasa de IVA (10, 22 o 0)'],
                      ['O', 'Sub Total', 'Sin IVA'],
                      ['P', 'Total', 'Con IVA'],
                    ].map(([col, name, desc]) => (
                      <tr key={col}><td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{col}</td><td style={{ fontWeight: 600 }}>{name}</td><td style={{ color: 'var(--gray)' }}>{desc}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="tip-box">
                  En ZetaSoftware: ir a <strong>Compras → Importar comprobantes → Desde Excel</strong> y seleccioná el archivo. Si las facturas son en USD, revisá la columna Cotización antes de importar.
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-icon" style={{ background: '#f0fdf4' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                    </svg>
                  </div>
                  <div>
                    <div className="card-title">Siigo</div>
                    <div className="card-desc">Exportación con 16 columnas. La fecha va en formato DD/MM/YYYY. Incluye Tasa de Cambio y el IVA calculado como monto.</div>
                  </div>
                </div>
                <table className="col-table">
                  <thead>
                    <tr><th>#</th><th>Columna</th><th>Descripción</th></tr>
                  </thead>
                  <tbody>
                    {[
                      ['A', 'Proveedor', 'Nombre del emisor'],
                      ['B', 'NIT/RUT', 'RUT del emisor'],
                      ['C', 'Tipo Documento', 'e-Factura, e-Ticket, etc.'],
                      ['D', 'Número', 'Número de documento'],
                      ['E', 'Fecha', 'Formato DD/MM/YYYY (ej: 11/04/2025)'],
                      ['F', 'Moneda', 'UYU o USD'],
                      ['G', 'Tasa Cambio', '1 (editar si la factura es en USD)'],
                      ['H', 'Código', 'Código del artículo'],
                      ['I', 'Descripción', 'Descripción del ítem'],
                      ['J', 'Cantidad', 'Unidades'],
                      ['K', 'Precio Unitario', 'Sin IVA'],
                      ['L', 'Descuento %', 'Porcentaje de descuento'],
                      ['M', 'IVA %', 'Tasa de IVA (10, 22 o 0)'],
                      ['N', 'Valor IVA', 'Monto de IVA del ítem (calculado)'],
                      ['O', 'Sub Total', 'Sin IVA'],
                      ['P', 'Total', 'Con IVA'],
                    ].map(([col, name, desc]) => (
                      <tr key={col}><td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{col}</td><td style={{ fontWeight: 600 }}>{name}</td><td style={{ color: 'var(--gray)' }}>{desc}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="tip-box">
                  En Siigo: ir a <strong>Compras → Importación de comprobantes → Cargar plantilla</strong> y seleccioná el archivo descargado de Ritto.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
