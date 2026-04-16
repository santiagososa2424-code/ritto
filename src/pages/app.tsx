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
  const [empresa, setEmpresa] = useState<string | undefined>();
  const [sistema, setSistema] = useState<SistemaContable>('gns');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [planKey, setPlanKey] = useState<string>('pyme');
  const [monthlyUsed, setMonthlyUsed] = useState<number>(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [limitWarning, setLimitWarning] = useState<string>('');
  const [page, setPage] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileMapRef = useRef<Map<string, File>>(new Map());

  const PLAN_LIMITS: Record<string, number | null> = { pro: null, pyme: null, empresa: null };
  const MAX_FILES = 10;
  const PAGE_SIZE = 20;

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
          if (p.plan) {
            setPlanKey(p.plan);
            setPlanName(p.plan.charAt(0).toUpperCase() + p.plan.slice(1));
          }
          if (p.sistema_contable) setSistema(p.sistema_contable as SistemaContable);
          if (p.empresa) setEmpresa(p.empresa);
        });
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    // Count invoices uploaded this month (org-wide, for plan limit enforcement)
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1); firstOfMonth.setHours(0, 0, 0, 0);
    supabase.from('invoices').select('*', { count: 'exact', head: true })
      .gte('created_at', firstOfMonth.toISOString())
      .then(({ count }) => { if (count != null) setMonthlyUsed(count); });

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

  async function retryInvoice(id: string) {
    const file = fileMapRef.current.get(id);
    if (!file) return;
    setInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, status: 'processing' as const, error: undefined } : inv));
    const formData = new FormData();
    formData.append('file', file);
    formData.append('id', id);
    try {
      const res = await fetch('/api/extract', { method: 'POST', body: formData });
      let data: ExtractedInvoice;
      try { data = await res.json(); }
      catch { data = { id, fileName: file.name, source: getSource(file), status: 'error', error: `Timeout (${res.status}) — intentá con un archivo más pequeño` }; }
      const merged = { ...data, id };
      setInvoices((prev) => prev.map((inv) => inv.id === id ? merged : inv));
      if (merged.status === 'done') { await saveInvoice(merged); setMonthlyUsed((n) => n + 1); }
    } catch {
      setInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, status: 'error', error: 'Error de conexión' } : inv));
    }
  }

  async function deleteInvoice(id: string) {
    setConfirmDelete(null);
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
    if (supported.length === 0) return;

    // Check file count limit
    if (supported.length > MAX_FILES) {
      setLimitWarning(`Máximo ${MAX_FILES} archivos a la vez. Se procesarán los primeros ${MAX_FILES}.`);
      setTimeout(() => setLimitWarning(''), 5000);
    }
    const toProcess = supported.slice(0, MAX_FILES);

    // Check monthly plan limit
    const limit = PLAN_LIMITS[planKey];
    if (limit !== null && monthlyUsed >= limit) {
      setLimitWarning(`Alcanzaste el límite de ${limit} facturas este mes para el plan ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}. Mejorá tu plan para continuar.`);
      setTimeout(() => setLimitWarning(''), 6000);
      return;
    }

    // Add all to UI immediately as "processing"
    const entries = toProcess.map((file) => ({
      id: crypto.randomUUID(),
      file,
    }));
    entries.forEach(({ id, file }) => fileMapRef.current.set(id, file));
    setInvoices((prev) => [
      ...entries.map(({ id, file }) => ({
        id, fileName: file.name, source: getSource(file), status: 'processing' as const,
      })),
      ...prev,
    ]);

    async function runEntry({ id, file }: { id: string; file: File }) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('id', id);
      try {
        const res = await fetch('/api/extract', { method: 'POST', body: formData });
        let data: ExtractedInvoice;
        try {
          data = await res.json();
        } catch {
          data = { id, fileName: file.name, source: getSource(file), status: 'error', error: `Timeout (${res.status}) — intentá con un archivo más pequeño` };
        }
        if (!res.ok) console.error('[ritto extract error]', file.name, 'status:', res.status, 'error:', (data as {error?: string}).error);
        const merged = { ...data, id };
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? merged : inv)));
        if (merged.status === 'done') {
          await saveInvoice(merged);
          setMonthlyUsed((n) => n + 1);
        }
      } catch (err) {
        console.error('[ritto extract catch]', file.name, err);
        setInvoices((prev) => prev.map((inv) =>
          inv.id === id ? { ...inv, status: 'error', error: 'Error de conexión' } : inv
        ));
      }
    }

    // XMLs: instant, run all in parallel
    // AI (PDF/image): max 2 concurrent to avoid Gemini timeouts
    const isXMLFile = (f: File) => f.name.toLowerCase().endsWith('.xml');
    const xmlEntries = entries.filter(e => isXMLFile(e.file));
    const aiEntries = entries.filter(e => !isXMLFile(e.file));

    async function runWithConcurrency(items: typeof entries, limit: number) {
      let i = 0;
      async function next(): Promise<void> {
        if (i >= items.length) return;
        const entry = items[i++];
        await runEntry(entry);
        return next();
      }
      await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
    }

    await Promise.all([
      Promise.all(xmlEntries.map(runEntry)),
      runWithConcurrency(aiEntries, 2),
    ]);
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

  function downloadCSV(invoiceList: ExtractedInvoice[], filename: string) {
    const headers = ['Proveedor','Tipo','Fecha','Número','Código','Descripción','Cantidad','Moneda','Precio Unit.','Descuento','Sub Total','Impuestos','Total'];
    const escape = (v: string | number) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows: string[] = [headers.join(',')];
    for (const inv of invoiceList.filter(i => i.status === 'done')) {
      const items = inv.items && inv.items.length > 0 ? inv.items : [{
        codigo: '', descripcion: inv.tipoDocumento ?? 'Factura', cantidad: 1,
        precioUnitario: inv.neto ?? inv.total ?? 0, descuento: 0,
        impuesto: inv.ivaTotal && inv.neto && inv.neto > 0 ? Math.round((inv.ivaTotal / inv.neto) * 100) : 22,
        subtotal: inv.neto ?? 0, totalItem: inv.total ?? 0,
      }];
      for (const item of items) {
        const imp = (item.subtotal ?? 0) * ((item.impuesto ?? 0) / 100);
        rows.push([
          inv.proveedor ?? '', inv.tipoDocumento ?? '', inv.fecha ?? '', inv.nroDocumento ?? '',
          item.codigo ?? '', item.descripcion ?? '', item.cantidad ?? 1, inv.moneda ?? 'UYU',
          item.precioUnitario ?? 0, item.descuento ?? 0, item.subtotal ?? 0, imp,
          (item.subtotal ?? 0) + imp,
        ].map(escape).join(','));
      }
    }
    const bom = '\uFEFF'; // UTF-8 BOM so Excel/Sheets handles accents correctly
    const blob = new Blob([bom + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const done = invoices.filter((i) => i.status === 'done');
  const processing = invoices.filter((i) => i.status === 'processing');
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonth = done.filter((inv) => inv.fecha?.startsWith(thisMonthKey));
  const totalAmount = done.reduce((sum, inv) => sum + (inv.total ?? 0), 0);

  const monthOptions = getMonthOptions(done);
  const monthLimit = PLAN_LIMITS[planKey];
  const monthPct = monthLimit ? Math.min(100, (monthlyUsed / monthLimit) * 100) : 0;
  const monthRemaining = monthLimit !== null ? Math.max(0, monthLimit - monthlyUsed) : null;

  const filteredInvoices = invoices
    .filter((inv) => filterMonth === 'all' || inv.fecha?.startsWith(filterMonth))
    .filter((inv) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        inv.proveedor?.toLowerCase().includes(q) ||
        inv.rut?.toLowerCase().includes(q) ||
        inv.fileName?.toLowerCase().includes(q)
      );
    });

  const totalPages = Math.ceil(filteredInvoices.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const pagedInvoices = filteredInvoices.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

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
        .page-wrap { padding: 28px 28px 80px; max-width: 1340px; }
        .main-layout { display: grid; grid-template-columns: 1fr 280px; gap: 24px; align-items: start; }
        .right-col { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 28px; }
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
        .search-input {
          border: 1px solid var(--border); border-radius: 7px; padding: 6px 10px 6px 32px;
          font-family: 'Figtree', sans-serif; font-size: 13px; background: var(--white);
          color: var(--dark); outline: none; width: 180px;
        }
        .search-input:focus { border-color: var(--green); }
        .search-wrap { position: relative; }
        .search-icon { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); pointer-events: none; }
        .limit-bar { margin-top: 8px; }
        .limit-track { background: var(--bg); border-radius: 99px; height: 4px; overflow: hidden; }
        .limit-fill { height: 100%; border-radius: 99px; transition: width 0.3s; }
        .limit-label { font-size: 11px; color: var(--gray); margin-top: 3px; }
        .warning-bar {
          background: #fef3c7; border: 1px solid #fde68a; border-radius: 10px;
          padding: 10px 14px; font-size: 13px; color: #78350f; margin-bottom: 14px;
          display: flex; align-items: center; gap: 8px;
        }
        .confirm-del { display: inline-flex; align-items: center; gap: 6px; }
        .btn-confirm-yes { background: var(--red); color: #fff; border: none; border-radius: 5px; padding: 3px 8px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: 'Figtree', sans-serif; }
        .btn-confirm-no { background: none; border: 1px solid var(--border); border-radius: 5px; padding: 3px 8px; font-size: 11px; cursor: pointer; font-family: 'Figtree', sans-serif; color: var(--gray); }

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

        /* Right panel */
        .rp-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 18px 20px; }
        .rp-title { font-size: 13px; font-weight: 700; color: var(--dark); margin-bottom: 14px; display: flex; align-items: center; gap: 7px; }
        .rp-title-icon { width: 24px; height: 24px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .news-item { padding: 10px 0; border-bottom: 1px solid var(--bg); }
        .news-item:last-child { border-bottom: none; padding-bottom: 0; }
        .news-item:first-child { padding-top: 0; }
        .news-badge { display: inline-block; padding: 2px 7px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
        .badge-new { background: #dcfce7; color: #166534; }
        .badge-tip { background: #eff6ff; color: #1d4ed8; }
        .badge-soon { background: #f3e8ff; color: #6b21a8; }
        .news-text { font-size: 13px; color: var(--dark); line-height: 1.45; }
        .news-date { font-size: 11px; color: var(--gray); margin-top: 2px; }
        .tip-item { display: flex; gap: 9px; padding: 8px 0; border-bottom: 1px solid var(--bg); align-items: flex-start; }
        .tip-item:last-child { border-bottom: none; padding-bottom: 0; }
        .tip-item:first-child { padding-top: 0; }
        .tip-dot { width: 18px; height: 18px; background: var(--green-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .tip-text { font-size: 13px; color: var(--gray); line-height: 1.45; }
        .tip-text strong { color: var(--dark); }
        .trial-card { background: linear-gradient(135deg, #0a7c59, #0d9b71); border-radius: 14px; padding: 18px 20px; color: #fff; }
        .trial-card-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
        .trial-card-sub { font-size: 12px; opacity: 0.8; margin-bottom: 14px; }
        .trial-bar { background: rgba(255,255,255,0.25); border-radius: 99px; height: 5px; margin-bottom: 12px; overflow: hidden; }
        .trial-bar-fill { height: 100%; background: #fff; border-radius: 99px; }
        .btn-upgrade-sm { display: block; background: #fff; color: var(--green); text-align: center; padding: 9px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; }

        @media (max-width: 1100px) {
          .main-layout { grid-template-columns: 1fr; }
          .right-col { display: none; }
        }
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

      <Sidebar active="facturas" userEmail={user.email} empresa={empresa} trialDaysLeft={trialDaysLeft} planName={planName} />

      <div className="with-sidebar">
        <div className="page-wrap">
          {trialDaysLeft !== null && trialDaysLeft <= 3 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: '#78350f' }}>
                ⏳ <strong>Te quedan {trialDaysLeft} día{trialDaysLeft !== 1 ? 's' : ''} de prueba.</strong> Activá tu plan para no perder el acceso.
              </span>
              <button onClick={() => router.push('/plan')} style={{ background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 16px', fontFamily: 'Figtree, sans-serif', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Ver planes →
              </button>
            </div>
          )}
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
                <span>Exportar XLS</span>
              </button>
              <button
                className="btn-export"
                style={{ background: 'var(--gray)' }}
                onClick={() => downloadCSV(done, `ritto-${new Date().toISOString().slice(0,10)}.csv`)}
                disabled={done.length === 0}
                title="Abre en Google Sheets, LibreOffice, Excel y más"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          <div className="main-layout">
          <div className="main-col">
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Total procesadas</div>
              <div className="stat-value">{done.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Uso mensual</div>
              <div className="stat-value">{monthlyUsed}{monthLimit !== null ? <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--gray)' }}>/{monthLimit}</span> : ''}</div>
              {monthLimit !== null && (
                <div className="limit-bar">
                  <div className="limit-track">
                    <div className="limit-fill" style={{ width: `${monthPct}%`, background: monthPct > 85 ? '#dc2626' : monthPct > 60 ? '#f59e0b' : 'var(--green)' }} />
                  </div>
                  <div className="limit-label">{monthRemaining} restantes este mes</div>
                </div>
              )}
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
            <p>Tocá para seleccionar o arrastrá — procesamos varios a la vez</p>
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

          {limitWarning && (
            <div className="warning-bar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {limitWarning}
            </div>
          )}

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
              <div className="search-wrap">
                <span className="search-icon">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9b9b9b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input className="search-input" placeholder="Buscar proveedor…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
              </div>
              {monthOptions.length > 0 && (
                <select className="filter-select" value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setPage(0); }}>
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
                    {pagedInvoices.map((inv) => (
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
                          {inv.status === 'error' && (
                            <span className="status-error" title={inv.error}>Error</span>
                          )}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {inv.status === 'done' && (
                            <>
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
                              <button
                                className="btn-dl"
                                style={{ marginLeft: 4, background: '#f0f0f0', color: '#555' }}
                                onClick={() => downloadCSV([inv], `${inv.proveedor ?? 'factura'}-${inv.fecha ?? ''}.csv`)}
                                title="Descargar CSV (abre en Google Sheets, LibreOffice, etc.)"
                              >
                                CSV
                              </button>
                            </>
                          )}
                          {inv.status === 'error' && fileMapRef.current.has(inv.id) && (
                            <button
                              className="btn-dl"
                              style={{ marginLeft: 4, background: '#fff3cd', color: '#856404', border: '1px solid #ffc107' }}
                              onClick={() => retryInvoice(inv.id)}
                              title="Reintentar extracción"
                            >↺ Reintentar</button>
                          )}
                          {confirmDelete === inv.id ? (
                            <span className="confirm-del" style={{ marginLeft: 4 }}>
                              <button className="btn-confirm-yes" onClick={() => deleteInvoice(inv.id)}>Sí</button>
                              <button className="btn-confirm-no" onClick={() => setConfirmDelete(null)}>No</button>
                            </span>
                          ) : (
                            <button className="btn-remove" onClick={() => setConfirmDelete(inv.id)} style={{ marginLeft: 4 }}>×</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--white)', cursor: safePage === 0 ? 'not-allowed' : 'pointer', opacity: safePage === 0 ? 0.4 : 1, fontFamily: 'Figtree, sans-serif', fontSize: 13 }}
                >← Anterior</button>
                <span style={{ fontSize: 13, color: 'var(--gray)' }}>Página {safePage + 1} de {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
                  style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--white)', cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: safePage >= totalPages - 1 ? 0.4 : 1, fontFamily: 'Figtree, sans-serif', fontSize: 13 }}
                >Siguiente →</button>
              </div>
            )}
          </div>
          </div>{/* end main-col */}

          {/* Right panel */}
          <div className="right-col">
            {trialDaysLeft !== null && (
              <div className="trial-card">
                <div className="trial-card-title">Trial activo</div>
                <div className="trial-card-sub">{trialDaysLeft} día{trialDaysLeft !== 1 ? 's' : ''} restante{trialDaysLeft !== 1 ? 's' : ''}</div>
                <div className="trial-bar">
                  <div className="trial-bar-fill" style={{ width: `${Math.max(5, ((14 - trialDaysLeft) / 14) * 100)}%` }} />
                </div>
                <a href="/plan" className="btn-upgrade-sm">Activar plan →</a>
              </div>
            )}

            <div className="rp-card">
              <div className="rp-title">
                <div className="rp-title-icon" style={{ background: '#dcfce7' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                </div>
                Novedades
              </div>
              <div className="news-item">
                <span className="news-badge badge-new">Nuevo</span>
                <div className="news-text">Descarga individual por factura en formato Excel</div>
                <div className="news-date">Abr 2025</div>
              </div>
              <div className="news-item">
                <span className="news-badge badge-new">Nuevo</span>
                <div className="news-text">Filtro por mes en el historial de facturas</div>
                <div className="news-date">Abr 2025</div>
              </div>
              <div className="news-item">
                <span className="news-badge badge-new">Nuevo</span>
                <div className="news-text">Soporte para GNS Contable, ZetaSoftware y Siigo</div>
                <div className="news-date">Abr 2025</div>
              </div>
              <div className="news-item">
                <span className="news-badge badge-soon">Próximamente</span>
                <div className="news-text">Integración directa con portal DGI Uruguay</div>
              </div>
            </div>

            <div className="rp-card">
              <div className="rp-title">
                <div className="rp-title-icon" style={{ background: 'var(--green-light)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                Consejos
              </div>
              <div className="tip-item">
                <div className="tip-dot">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="tip-text"><strong>Usá XMLs de CFE</strong> para extracción instantánea sin consumir créditos de IA</div>
              </div>
              <div className="tip-item">
                <div className="tip-dot">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="tip-text"><strong>Subí varias facturas</strong> a la vez — se procesan en paralelo</div>
              </div>
              <div className="tip-item">
                <div className="tip-dot">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div className="tip-text">Cambiá tu <strong>sistema contable</strong> en Configuración en cualquier momento</div>
              </div>
            </div>
          </div>

          </div>{/* end main-layout */}
        </div>
      </div>
    </>
  );
}
