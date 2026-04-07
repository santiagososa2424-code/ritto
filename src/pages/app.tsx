import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ExtractedInvoice, InvoiceSource } from '../lib/types';

function sourceLabel(s: InvoiceSource) {
  if (s === 'cfe_xml') return 'CFE';
  if (s === 'pdf') return 'PDF';
  return 'IMG';
}

function fmt(n?: number) {
  if (n == null) return '—';
  return new Intl.NumberFormat('es-UY', { minimumFractionDigits: 0 }).format(n);
}

function fromDB(row: Record<string, unknown>): ExtractedInvoice {
  return {
    id: row.id as string,
    fileName: row.file_name as string,
    source: row.source as InvoiceSource,
    status: 'done',
    proveedor: row.proveedor as string | undefined,
    rut: row.rut as string | undefined,
    fecha: row.fecha as string | undefined,
    nroDocumento: row.nro_documento as string | undefined,
    tipoDocumento: row.tipo_documento as string | undefined,
    moneda: (row.moneda as string) ?? 'UYU',
    neto: row.neto as number | undefined,
    iva10: row.iva10 as number | undefined,
    iva22: row.iva22 as number | undefined,
    ivaTotal: row.iva_total as number | undefined,
    total: row.total as number | undefined,
  };
}

export default function AppPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [invoices, setInvoices] = useState<ExtractedInvoice[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      setUser(data.user);
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    supabase.from('invoices').select('*').order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setInvoices(data.map(fromDB));
        setLoadingHistory(false);
      });
  }, [user]);

  async function saveInvoice(inv: ExtractedInvoice) {
    if (!user) return;
    await supabase.from('invoices').insert({
      id: inv.id, user_id: user.id, file_name: inv.fileName, source: inv.source,
      proveedor: inv.proveedor, rut: inv.rut, fecha: inv.fecha ?? null,
      nro_documento: inv.nroDocumento, tipo_documento: inv.tipoDocumento,
      moneda: inv.moneda ?? 'UYU', neto: inv.neto ?? null, iva10: inv.iva10 ?? null,
      iva22: inv.iva22 ?? null, iva_total: inv.ivaTotal ?? null, total: inv.total ?? null,
    });
  }

  async function deleteInvoice(id: string) {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    await supabase.from('invoices').delete().eq('id', id);
  }

  function getSource(file: File): InvoiceSource {
    if (file.name.toLowerCase().endsWith('.xml') || file.type.includes('xml')) return 'cfe_xml';
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'pdf';
    return 'image';
  }

  async function processFiles(files: File[]) {
    const supported = files.filter((f) => {
      const n = f.name.toLowerCase();
      return n.endsWith('.xml') || n.endsWith('.pdf') || f.type.startsWith('image/');
    });
    for (const file of supported) {
      const id = crypto.randomUUID();
      setInvoices((prev) => [{ id, fileName: file.name, source: getSource(file), status: 'processing' }, ...prev]);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('id', id);
      try {
        const res = await fetch('/api/extract', { method: 'POST', body: formData });
        const data: ExtractedInvoice = await res.json();
        const merged = { ...data, id };
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? merged : inv)));
        if (merged.status === 'done') await saveInvoice(merged);
      } catch {
        setInvoices((prev) => prev.map((inv) =>
          inv.id === id ? { ...inv, status: 'error', error: 'Error de conexión' } : inv
        ));
      }
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, [user]);

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

  const done = invoices.filter((i) => i.status === 'done');
  const processing = invoices.filter((i) => i.status === 'processing');

  if (!user) return null;

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
          background: rgba(245,245,247,0.95);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border);
          padding: 0 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 54px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .logo { font-family: 'DM Serif Display', serif; font-size: 20px; color: var(--green); }
        .nav-right { display: flex; align-items: center; gap: 8px; }
        .btn-icon {
          background: none;
          border: 1px solid var(--border);
          width: 36px; height: 36px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          color: var(--gray);
          flex-shrink: 0;
        }
        .btn-icon:hover { background: var(--bg); }
        .btn-export {
          background: var(--green);
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-family: 'Figtree', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
        }
        .btn-export:disabled { opacity: 0.4; cursor: not-allowed; }

        .main { max-width: 1000px; margin: 0 auto; padding: 24px 1.25rem 60px; }

        /* Upload zone */
        .upload-zone {
          border: 2px dashed var(--border);
          border-radius: 14px;
          padding: 44px 20px;
          text-align: center;
          background: var(--white);
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          margin-bottom: 24px;
          -webkit-tap-highlight-color: transparent;
        }
        .upload-zone.dragging { border-color: var(--green); background: var(--green-light); }
        .upload-icon {
          width: 48px; height: 48px;
          background: var(--green-light);
          border-radius: 12px;
          margin: 0 auto 14px;
          display: flex; align-items: center; justify-content: center;
        }
        .upload-zone h2 { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
        .upload-zone p { font-size: 13px; color: var(--gray); }
        .upload-types { display: flex; gap: 6px; justify-content: center; margin-top: 14px; flex-wrap: wrap; }
        .type-pill {
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 20px; padding: 3px 10px;
          font-size: 12px; font-weight: 500; color: var(--gray);
        }
        .type-pill.xml { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }

        /* Processing bar */
        .processing-bar {
          background: var(--green-light);
          border: 1px solid rgba(10,124,89,0.2);
          border-radius: 10px;
          padding: 11px 14px;
          display: flex; align-items: center; gap: 10px;
          font-size: 14px; color: var(--green);
          margin-bottom: 14px; font-weight: 500;
        }
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(10,124,89,0.3);
          border-top-color: var(--green);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Section */
        .section-header {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .section-title { font-size: 14px; font-weight: 600; }
        .count-badge {
          background: var(--green-light); color: var(--green);
          border-radius: 20px; padding: 2px 10px;
          font-size: 12px; font-weight: 600;
        }

        /* Table */
        .table-wrap {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }
        .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 680px; }
        thead th {
          text-align: left; padding: 10px 13px;
          color: var(--gray); font-weight: 500; font-size: 11px;
          text-transform: uppercase; letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border); background: #fafafa;
          white-space: nowrap;
        }
        tbody td { padding: 11px 13px; border-bottom: 1px solid var(--bg); vertical-align: middle; }
        tbody tr:last-child td { border-bottom: none; }
        tbody tr:active td { background: #fafafa; }
        .file-name { font-weight: 500; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .source-tag { display: inline-block; padding: 2px 7px; border-radius: 5px; font-size: 11px; font-weight: 600; }
        .source-cfe { background: #eff6ff; color: #1d4ed8; }
        .source-pdf { background: #fef3c7; color: #92400e; }
        .source-image { background: #f3e8ff; color: #6b21a8; }
        .status-processing { display: inline-flex; align-items: center; gap: 5px; color: var(--gray); font-size: 12px; }
        .status-done { background: var(--green-light); color: var(--green); border-radius: 5px; padding: 2px 8px; font-size: 11px; font-weight: 600; display: inline-block; }
        .status-error { background: var(--red-light); color: var(--red); border-radius: 5px; padding: 2px 8px; font-size: 11px; font-weight: 600; display: inline-block; }
        .btn-remove { background: none; border: none; color: var(--gray); cursor: pointer; padding: 6px; border-radius: 4px; line-height: 1; font-size: 16px; }
        .btn-remove:active { color: var(--red); background: var(--red-light); }

        .empty-state { padding: 44px 20px; text-align: center; color: var(--gray); font-size: 14px; line-height: 1.7; }

        /* Mobile */
        @media (max-width: 600px) {
          .main { padding: 16px 1rem 80px; }
          .upload-zone { padding: 36px 16px; }
          .btn-export span { display: none; }
        }
      `}</style>

      <nav className="nav">
        <div className="logo">Ritto</div>
        <div className="nav-right">
          <button
            className="btn-export"
            onClick={exportExcel}
            disabled={done.length === 0}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Exportar Excel</span>
          </button>
          <button className="btn-icon" onClick={() => router.push('/settings')} title="Configuración">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>
      </nav>

      <main className="main">
        <div
          className={`upload-zone${dragging ? ' dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="upload-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <h2>Subí tus facturas</h2>
          <p>Tocá para seleccionar o arrastrá archivos acá</p>
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

        {processing.length > 0 && (
          <div className="processing-bar">
            <div className="spinner" />
            Procesando {processing.length} archivo{processing.length !== 1 ? 's' : ''}…
          </div>
        )}

        <div className="section-header">
          <span className="section-title">Historial</span>
          {done.length > 0 && <span className="count-badge">{done.length} factura{done.length !== 1 ? 's' : ''}</span>}
        </div>

        <div className="table-wrap">
          {loadingHistory ? (
            <div className="empty-state">
              <div className="spinner" style={{ margin: '0 auto 10px' }} />
              Cargando…
            </div>
          ) : invoices.length === 0 ? (
            <div className="empty-state">
              Todavía no subiste ninguna factura.<br />
              Soportamos imágenes, PDFs y XMLs de CFE.
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Archivo</th>
                    <th>Tipo</th>
                    <th>Proveedor</th>
                    <th>RUT</th>
                    <th>Fecha</th>
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
                      <td><div className="file-name" title={inv.fileName}>{inv.fileName}</div></td>
                      <td>
                        <span className={`source-tag source-${inv.source === 'cfe_xml' ? 'cfe' : inv.source}`}>
                          {sourceLabel(inv.source)}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{inv.proveedor ?? '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12, whiteSpace: 'nowrap' }}>{inv.rut ?? '—'}</td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{inv.fecha ?? '—'}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {inv.neto != null ? `${inv.moneda ?? 'UYU'} ${fmt(inv.neto)}` : '—'}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {inv.ivaTotal != null ? fmt(inv.ivaTotal) : '—'}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {inv.total != null ? `${inv.moneda ?? 'UYU'} ${fmt(inv.total)}` : '—'}
                      </td>
                      <td>
                        {inv.status === 'processing' && <span className="status-processing"><div className="spinner" />…</span>}
                        {inv.status === 'done' && <span className="status-done">Listo</span>}
                        {inv.status === 'error' && <span className="status-error" title={inv.error}>Error</span>}
                      </td>
                      <td>
                        <button className="btn-remove" onClick={() => deleteInvoice(inv.id)}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
