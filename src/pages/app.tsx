import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ExtractedInvoice, InvoiceItem, InvoiceSource, SistemaContable } from '../lib/types';
import Sidebar from '../components/Sidebar';

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
    items: (row.items as InvoiceItem[]) ?? undefined,
  };
}

function getMonthOptions(invoices: ExtractedInvoice[]): { value: string; label: string }[] {
  const months = new Set<string>();
  for (const inv of invoices) {
    if (inv.fecha) months.add(inv.fecha.slice(0, 7));
  }
  return Array.from(months)
    .sort((a, b) => b.localeCompare(a))
    .map((m) => {
      const [y, mo] = m.split('-');
      const label = new Date(Number(y), Number(mo) - 1).toLocaleDateString('es-UY', { month: 'long', year: 'numeric' });
      return { value: m, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
}

const SISTEMA_NAMES: Record<string, string> = {
  gns: 'GNS Contable',
  zeta: 'ZetaSoftware',
  siigo: 'Siigo',
};

export default function AppPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [invoices, setInvoices] = useState<ExtractedInvoice[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string | undefined>();
  const [sistema, setSistema] = useState<SistemaContable>('gns');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [downloading, setDownloading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      setUser(data.user);
      supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
        .then(({ data: p }) => {
          if (!p) return;
          const isBlocked = p.subscription_status === 'blocked';
          const trialExpired = p.subscription_status === 'trial' && p.trial_ends_at && new Date(p.trial_ends_at) < new Date();
          if (isBlocked || trialExpired) { router.replace('/blocked'); return; }
          if (p.trial_ends_at && p.subscription_status === 'trial') {
            setTrialDaysLeft(Math.max(0, Math.ceil((new Date(p.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))));
          }
          if (p.plan) setPlanName(p.plan.charAt(0).toUpperCase() + p.plan.slice(1));
          if (p.sistema_contable) setSistema(p.sistema_contable as SistemaContable);
        });
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
      items: inv.items ?? [],
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

  async function downloadExcel(invoiceList: ExtractedInvoice[], label: string) {
    setDownloading(label);
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoices: invoiceList, sistema }),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.headers.get('Content-Disposition')?.split('filename=')[1] ?? 'facturas.xlsx';
    a.click();
    URL.revokeObjectURL(url);
    setDownloading(null);
  }

  const done = invoices.filter((i) => i.status === 'done');
  const processing = invoices.filter((i) => i.status === 'processing');
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonth = done.filter((inv) => inv.fecha?.startsWith(thisMonthKey));
  const totalAmount = done.reduce((sum, inv) => sum + (inv.total ?? 0), 0);

  const monthOptions = getMonthOptions(done);
  const filteredInvoices = filterMonth === 'all'
    ? invoices
    : invoices.filter((inv) => inv.fecha?.startsWith(filterMonth));

  if (!user) return null;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7;
          --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0;
          --white: #ffffff; --red: #dc2626; --red-light: #fef2f2;
        }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page-wrap { padding: 28px 28px 80px; max-width: 1060px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 12px; }
        .page-title { font-family: 'DM Serif Display', serif; font-size: 28px; color: var(--dark); line-height: 1.1; }
        .page-sub { font-size: 13px; color: var(--gray); margin-top: 3px; }
        .header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

        .sistema-chip {
          background: var(--green-light); color: var(--green);
          border-radius: 20px; padding: 4px 10px; font-size: 12px; font-weight: 600;
          display: flex; align-items: center; gap: 5px;
        }

        .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
        .stat-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; }
        .stat-label { font-size: 12px; font-weight: 500; color: var(--gray); margin-bottom: 6px; }
        .stat-value { font-size: 26px; font-weight: 600; color: var(--dark); line-height: 1; }

        .btn-export {
          background: var(--green); color: #fff; border: none;
          padding: 10px 16px; border-radius: 8px;
          font-family: 'Figtree', sans-serif; font-size: 13px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 5px; white-space: nowrap;
        }
        .btn-export:disabled { opacity: 0.4; cursor: not-allowed; }

        .upload-zone {
          border: 2px dashed var(--border); border-radius: 14px;
          padding: 40px 20px; text-align: center; background: var(--white);
          cursor: pointer; transition: border-color 0.15s, background 0.15s;
          margin-bottom: 24px; -webkit-tap-highlight-color: transparent;
        }
        .upload-zone.dragging { border-color: var(--green); background: var(--green-light); }
        .upload-icon { width: 48px; height: 48px; background: var(--green-light); border-radius: 12px; margin: 0 auto 14px; display: flex; align-items: center; justify-content: center; }
        .upload-zone h2 { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
        .upload-zone p { font-size: 13px; color: var(--gray); }
        .upload-types { display: flex; gap: 6px; justify-content: center; margin-top: 14px; flex-wrap: wrap; }
        .type-pill { background: var(--bg); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 500; color: var(--gray); }
        .type-pill.xml { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }

        .processing-bar {
          background: var(--green-light); border: 1px solid rgba(10,124,89,0.2);
          border-radius: 10px; padding: 11px 14px;
          display: flex; align-items: center; gap: 10px;
          font-size: 14px; color: var(--green); margin-bottom: 14px; font-weight: 500;
        }
        .spinner { width: 14px; height: 14px; border: 2px solid rgba(10,124,89,0.3); border-top-color: var(--green); border-radius: 50%; animation: spin 0.8s linear infinite; flex-shrink: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
        .section-title { font-size: 14px; font-weight: 600; }
        .count-badge { background: var(--green-light); color: var(--green); border-radius: 20px; padding: 2px 10px; font-size: 12px; font-weight: 600; }
        .section-right { display: flex; align-items: center; gap: 8px; }

        .filter-select {
          border: 1px solid var(--border); border-radius: 7px; padding: 6px 10px;
          font-family: 'Figtree', sans-serif; font-size: 13px; background: var(--white);
          color: var(--dark); outline: none; cursor: pointer;
        }

        .table-wrap { background: var(--white); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 720px; }
        thead th { text-align: left; padding: 10px 13px; color: var(--gray); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); background: #fafafa; white-space: nowrap; }
        tbody td { padding: 11px 13px; border-bottom: 1px solid var(--bg); vertical-align: middle; }
        tbody tr:last-child td { border-bottom: none; }
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
        .btn-dl {
          background: none; border: 1px solid var(--border);
          color: var(--green); cursor: pointer; padding: 4px 9px;
          border-radius: 6px; font-size: 11px; font-weight: 600;
          font-family: 'Figtree', sans-serif; white-space: nowrap;
          display: inline-flex; align-items: center; gap: 4px;
        }
        .btn-dl:hover { background: var(--green-light); border-color: var(--green); }
        .btn-dl:disabled { opacity: 0.4; cursor: not-allowed; }
        .empty-state { padding: 44px 20px; text-align: center; color: var(--gray); font-size: 14px; line-height: 1.7; }

        @media (max-width: 768px) {
          .page-wrap { padding: 18px 16px 80px; }
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .stats-row .stat-card:last-child { display: none; }
          .page-title { font-size: 22px; }
          .sistema-chip span { display: none; }
        }
        @media (max-width: 480px) {
          .btn-export span { display: none; }
        }
      `}</style>

      <Sidebar active="facturas" userEmail={user.email} trialDaysLeft={trialDaysLeft} planName={planName} />

      <div className="with-sidebar">
        <div className="page-wrap">
          <div className="page-header">
            <div>
              <h1 className="page-title">Facturas</h1>
              <p className="page-sub">Procesá y exportá tus comprobantes fiscales</p>
            </div>
            <div className="header-right">
              <div className="sistema-chip" title={`Sistema: ${SISTEMA_NAMES[sistema]}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M9 21V9"/>
                </svg>
                <span>{SISTEMA_NAMES[sistema]}</span>
              </div>
              <button
                className="btn-export"
                onClick={() => downloadExcel(done, 'all')}
                disabled={done.length === 0 || downloading !== null}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Exportar todas</span>
              </button>
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Total procesadas</div>
              <div className="stat-value">{done.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Este mes</div>
              <div className="stat-value">{thisMonth.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Monto total (UYU)</div>
              <div className="stat-value" style={{ fontSize: totalAmount > 9999999 ? 18 : 26 }}>
                {totalAmount > 0 ? fmt(totalAmount) : '—'}
              </div>
            </div>
          </div>

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="section-title">Historial de facturas</span>
              {done.length > 0 && <span className="count-badge">{done.length}</span>}
            </div>
            <div className="section-right">
              {monthOptions.length > 0 && (
                <select
                  className="filter-select"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                >
                  <option value="all">Todas las fechas</option>
                  {monthOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="table-wrap">
            {loadingHistory ? (
              <div className="empty-state">
                <div className="spinner" style={{ margin: '0 auto 10px' }} />
                Cargando…
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="empty-state">
                {filterMonth !== 'all'
                  ? 'No hay facturas en ese período.'
                  : 'Todavía no subiste ninguna factura.\nSoportamos imágenes, PDFs y XMLs de CFE.'}
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
                    {filteredInvoices.map((inv) => (
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
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {inv.status === 'done' && (
                            <button
                              className="btn-dl"
                              disabled={downloading === inv.id}
                              onClick={() => downloadExcel([inv], inv.id)}
                              title={`Descargar para ${SISTEMA_NAMES[sistema]}`}
                            >
                              {downloading === inv.id
                                ? <div className="spinner" style={{ borderTopColor: 'var(--green)' }} />
                                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
                              XLS
                            </button>
                          )}
                          <button className="btn-remove" onClick={() => deleteInvoice(inv.id)} style={{ marginLeft: 4 }}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
