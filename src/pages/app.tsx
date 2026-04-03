import { useCallback, useRef, useState } from 'react';
import type { ExtractedInvoice, InvoiceSource } from '../lib/types';

function sourceLabel(s: InvoiceSource) {
  if (s === 'cfe_xml') return 'CFE Digital';
  if (s === 'pdf') return 'PDF';
  return 'Imagen';
}

function fmt(n?: number) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 0 }).format(n);
}

export default function AppPage() {
  const [invoices, setInvoices] = useState<ExtractedInvoice[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function getSource(file: File): InvoiceSource {
    if (file.name.toLowerCase().endsWith('.xml') || file.type.includes('xml')) return 'cfe_xml';
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
    return 'image';
  }

  async function processFiles(files: File[]) {
    const supported = files.filter((f) => {
      const name = f.name.toLowerCase();
      return (
        name.endsWith('.xml') ||
        name.endsWith('.pdf') ||
        f.type.startsWith('image/')
      );
    });

    for (const file of supported) {
      const id = crypto.randomUUID();
      setInvoices((prev) => [
        ...prev,
        { id, fileName: file.name, source: getSource(file), status: 'processing' },
      ]);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('id', id);

      try {
        const res = await fetch('/api/extract', { method: 'POST', body: formData });
        const data: ExtractedInvoice = await res.json();
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...data } : inv)));
      } catch {
        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === id ? { ...inv, status: 'error', error: 'Error de conexión' } : inv
          )
        );
      }
    }
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      processFiles(Array.from(e.dataTransfer.files));
    },
    []
  );

  async function exportExcel() {
    const done = invoices.filter((i) => i.status === 'done');
    if (!done.length) return;
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoices: done }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.headers.get('Content-Disposition')?.split('filename=')[1] ?? 'facturas.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  function removeInvoice(id: string) {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  }

  const done = invoices.filter((i) => i.status === 'done');
  const processing = invoices.filter((i) => i.status === 'processing');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --green: #0a7c59;
          --green-light: #e6f4ef;
          --bg: #f5f5f7;
          --dark: #111111;
          --gray: #6b6b6b;
          --border: #e0e0e0;
          --white: #ffffff;
          --red: #dc2626;
          --red-light: #fef2f2;
        }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .nav {
          background: rgba(245,245,247,0.92);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border);
          padding: 0 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 58px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .logo { font-family: 'DM Serif Display', serif; font-size: 21px; color: var(--green); }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .btn-export {
          background: var(--green);
          color: #fff;
          border: none;
          padding: 8px 20px;
          border-radius: 8px;
          font-family: 'Figtree', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .btn-export:disabled { opacity: 0.4; cursor: not-allowed; }
        .main { max-width: 1100px; margin: 0 auto; padding: 40px 2rem; }
        .upload-section { margin-bottom: 36px; }
        .upload-zone {
          border: 2px dashed var(--border);
          border-radius: 16px;
          padding: 56px 24px;
          text-align: center;
          background: var(--white);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .upload-zone.dragging {
          border-color: var(--green);
          background: var(--green-light);
        }
        .upload-icon {
          width: 52px;
          height: 52px;
          background: var(--green-light);
          border-radius: 12px;
          margin: 0 auto 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .upload-zone h2 { font-size: 17px; font-weight: 600; margin-bottom: 8px; }
        .upload-zone p { font-size: 14px; color: var(--gray); margin-bottom: 4px; }
        .upload-types {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 16px;
          flex-wrap: wrap;
        }
        .type-pill {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 500;
          color: var(--gray);
        }
        .type-pill.xml { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .section-title { font-size: 15px; font-weight: 600; }
        .count-badge {
          background: var(--green-light);
          color: var(--green);
          border-radius: 20px;
          padding: 2px 10px;
          font-size: 12px;
          font-weight: 600;
        }
        .table-wrap {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
        }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        thead th {
          text-align: left;
          padding: 11px 14px;
          color: var(--gray);
          font-weight: 500;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border);
          background: #fafafa;
        }
        tbody td { padding: 12px 14px; border-bottom: 1px solid var(--bg); vertical-align: middle; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:hover td { background: #fafafa; }
        .file-name { font-weight: 500; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .source-tag {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 5px;
          font-size: 11px;
          font-weight: 600;
        }
        .source-cfe { background: #eff6ff; color: #1d4ed8; }
        .source-pdf { background: #fef3c7; color: #92400e; }
        .source-image { background: #f3e8ff; color: #6b21a8; }
        .status-processing {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--gray);
          font-size: 12px;
        }
        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid var(--border);
          border-top-color: var(--green);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .status-done {
          display: inline-block;
          background: var(--green-light);
          color: var(--green);
          border-radius: 5px;
          padding: 2px 9px;
          font-size: 11px;
          font-weight: 600;
        }
        .status-error {
          display: inline-block;
          background: var(--red-light);
          color: var(--red);
          border-radius: 5px;
          padding: 2px 9px;
          font-size: 11px;
          font-weight: 600;
        }
        .btn-remove {
          background: none;
          border: none;
          color: var(--gray);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          line-height: 1;
          font-size: 16px;
        }
        .btn-remove:hover { color: var(--red); background: var(--red-light); }
        .empty-state {
          padding: 48px 24px;
          text-align: center;
          color: var(--gray);
          font-size: 14px;
        }
        .processing-bar {
          background: var(--green-light);
          border: 1px solid rgba(10,124,89,0.2);
          border-radius: 10px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: var(--green);
          margin-bottom: 16px;
          font-weight: 500;
        }
      `}</style>

      <nav className="nav">
        <div className="logo">Ritto</div>
        <div className="nav-right">
          <span style={{ fontSize: 13, color: 'var(--gray)' }}>
            {done.length} factura{done.length !== 1 ? 's' : ''} procesada{done.length !== 1 ? 's' : ''}
          </span>
          <button className="btn-export" onClick={exportExcel} disabled={done.length === 0}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exportar Excel
          </button>
        </div>
      </nav>

      <main className="main">
        <div className="upload-section">
          <div
            className={`upload-zone${dragging ? ' dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <div className="upload-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <h2>Arrastrá tus facturas acá</h2>
            <p>o hacé clic para seleccionar archivos</p>
            <div className="upload-types">
              <span className="type-pill xml">XML · CFE Digital</span>
              <span className="type-pill">PDF</span>
              <span className="type-pill">JPG / PNG</span>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept=".xml,.pdf,.jpg,.jpeg,.png,.webp"
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files) processFiles(Array.from(e.target.files)); e.target.value = ''; }}
            />
          </div>
        </div>

        {processing.length > 0 && (
          <div className="processing-bar">
            <div className="spinner" />
            Procesando {processing.length} archivo{processing.length !== 1 ? 's' : ''}…
          </div>
        )}

        <div>
          <div className="section-header">
            <span className="section-title">Resultados</span>
            {invoices.length > 0 && (
              <span className="count-badge">{invoices.length} archivo{invoices.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="table-wrap">
            {invoices.length === 0 ? (
              <div className="empty-state">
                Todavía no subiste ninguna factura.<br />
                Soportamos imágenes, PDFs y XMLs (CFE digitales del mail).
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Archivo</th>
                    <th>Tipo</th>
                    <th>Proveedor</th>
                    <th>RUT</th>
                    <th>Fecha</th>
                    <th>Nro Doc</th>
                    <th>Neto</th>
                    <th>IVA</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <div className="file-name" title={inv.fileName}>{inv.fileName}</div>
                      </td>
                      <td>
                        <span className={`source-tag source-${inv.source === 'cfe_xml' ? 'cfe' : inv.source}`}>
                          {sourceLabel(inv.source)}
                        </span>
                      </td>
                      <td>{inv.proveedor ?? '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{inv.rut ?? '—'}</td>
                      <td style={{ fontSize: 12 }}>{inv.fecha ?? '—'}</td>
                      <td style={{ fontSize: 12 }}>{inv.nroDocumento ?? '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {inv.neto != null ? `${inv.moneda ?? 'UYU'} ${fmt(inv.neto)}` : '—'}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {inv.ivaTotal != null ? fmt(inv.ivaTotal) : '—'}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {inv.total != null ? `${inv.moneda ?? 'UYU'} ${fmt(inv.total)}` : '—'}
                      </td>
                      <td>
                        {inv.status === 'processing' && (
                          <span className="status-processing">
                            <div className="spinner" /> Procesando
                          </span>
                        )}
                        {inv.status === 'done' && <span className="status-done">Listo</span>}
                        {inv.status === 'error' && (
                          <span className="status-error" title={inv.error}>Error</span>
                        )}
                      </td>
                      <td>
                        <button className="btn-remove" onClick={() => removeInvoice(inv.id)} title="Eliminar">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
