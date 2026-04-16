import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import type { ExtractedInvoice, InvoiceSource } from '../lib/types';

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

interface MonthData { label: string; total: number; count: number; }
interface SupplierData { proveedor: string; total: number; count: number; }

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [invoices, setInvoices] = useState<ExtractedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<string | undefined>();
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      setUser(data.user);
      supabase.from('profiles').select('*').eq('id', data.user.id).single().then(({ data: p }) => {
        if (!p) return;
        if (p.trial_ends_at && p.subscription_status === 'trial') {
          setTrialDaysLeft(Math.max(0, Math.ceil((new Date(p.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))));
        }
        if (p.plan) setPlanName(p.plan.charAt(0).toUpperCase() + p.plan.slice(1));
        if (p.empresa) setEmpresa(p.empresa);
      });
      supabase.from('invoices').select('*').order('created_at', { ascending: false }).then(({ data: rows }) => {
        if (rows) setInvoices(rows.map(fromDB));
        setLoading(false);
      });
    });
  }, [router]);

  const done = invoices.filter((i) => i.status === 'done');

  // By month
  const byMonth: Record<string, MonthData> = {};
  for (const inv of done) {
    const key = inv.fecha?.slice(0, 7) ?? 'Sin fecha';
    if (!byMonth[key]) {
      const [y, mo] = key.split('-');
      const label = y && mo
        ? new Date(Number(y), Number(mo) - 1).toLocaleDateString('es-UY', { month: 'short', year: '2-digit' })
        : key;
      byMonth[key] = { label, total: 0, count: 0 };
    }
    byMonth[key].total += inv.total ?? 0;
    byMonth[key].count += 1;
  }
  const monthData: MonthData[] = Object.entries(byMonth)
    .filter(([k]) => k !== 'Sin fecha')
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([, v]) => v);

  // Top suppliers
  const bySupplier: Record<string, SupplierData> = {};
  for (const inv of done) {
    const key = inv.proveedor ?? 'Sin proveedor';
    if (!bySupplier[key]) bySupplier[key] = { proveedor: key, total: 0, count: 0 };
    bySupplier[key].total += inv.total ?? 0;
    bySupplier[key].count += 1;
  }
  const topSuppliers = Object.values(bySupplier).sort((a, b) => b.total - a.total).slice(0, 5);

  const totalAmount = done.reduce((s, i) => s + (i.total ?? 0), 0);
  const totalIva10 = done.reduce((s, i) => s + (i.iva10 ?? 0), 0);
  const totalIva22 = done.reduce((s, i) => s + (i.iva22 ?? 0), 0);
  const totalIva = done.reduce((s, i) => s + (i.ivaTotal ?? 0), 0);
  const totalNeto = done.reduce((s, i) => s + (i.neto ?? 0), 0);

  const maxMonthTotal = Math.max(...monthData.map((m) => m.total), 1);

  if (!user) return null;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7; --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0; --white: #ffffff; }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page-wrap { padding: 28px 28px 80px; max-width: 1100px; }
        .page-title { font-family: 'DM Serif Display', serif; font-size: 28px; color: var(--dark); line-height: 1.1; margin-bottom: 4px; }
        .page-sub { font-size: 13px; color: var(--gray); margin-bottom: 28px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
        .stat-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 18px 20px; }
        .stat-label { font-size: 12px; font-weight: 500; color: var(--gray); margin-bottom: 6px; }
        .stat-value { font-size: 24px; font-weight: 700; color: var(--dark); line-height: 1; }
        .stat-sub { font-size: 11px; color: var(--gray); margin-top: 4px; }
        .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 22px 24px; }
        .card-title { font-size: 14px; font-weight: 700; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
        .bar-wrap { display: flex; align-items: flex-end; gap: 8px; height: 140px; }
        .bar-col { display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; min-width: 0; }
        .bar-rect { width: 100%; border-radius: 4px 4px 0 0; background: var(--green); min-height: 4px; transition: height 0.3s; }
        .bar-label { font-size: 10px; color: var(--gray); text-align: center; white-space: nowrap; }
        .bar-val { font-size: 10px; color: var(--dark); font-weight: 600; white-space: nowrap; }
        .sup-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--bg); }
        .sup-row:last-child { border-bottom: none; }
        .sup-bar-wrap { flex: 1; background: var(--bg); border-radius: 99px; height: 6px; overflow: hidden; }
        .sup-bar-fill { height: 100%; border-radius: 99px; background: var(--green); }
        .sup-name { font-size: 13px; font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
        .sup-amount { font-size: 12px; color: var(--gray); white-space: nowrap; flex-shrink: 0; }
        .iva-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--bg); }
        .iva-row:last-child { border-bottom: none; }
        .iva-label { font-size: 13px; color: var(--dark); }
        .iva-val { font-size: 14px; font-weight: 700; }
        .empty-dash { text-align: center; color: var(--gray); font-size: 13px; padding: 40px 20px; line-height: 1.7; }
        @media (max-width: 900px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .dash-grid { grid-template-columns: 1fr; } }
        @media (max-width: 640px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .page-wrap { padding: 18px 16px 80px; } }
      `}</style>

      <Sidebar active="dashboard" userEmail={user.email} empresa={empresa} trialDaysLeft={trialDaysLeft} planName={planName} />

      <div className="with-sidebar">
        <div className="page-wrap">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Resumen de tus comprobantes fiscales</p>

          {loading ? (
            <div className="empty-dash">Cargando datos…</div>
          ) : done.length === 0 ? (
            <div className="empty-dash">
              Todavía no hay facturas procesadas.<br />
              <a href="/app" style={{ color: 'var(--green)', fontWeight: 600 }}>Subí tus primeras facturas →</a>
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-label">Total facturas</div>
                  <div className="stat-value">{done.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Monto total (UYU)</div>
                  <div className="stat-value" style={{ fontSize: totalAmount > 9999999 ? 18 : 24 }}>{fmt(totalAmount)}</div>
                  <div className="stat-sub">Neto: {fmt(totalNeto)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">IVA 22%</div>
                  <div className="stat-value" style={{ fontSize: 22 }}>{fmt(totalIva22)}</div>
                  <div className="stat-sub">De {done.filter(i => (i.iva22 ?? 0) > 0).length} facturas</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">IVA 10%</div>
                  <div className="stat-value" style={{ fontSize: 22 }}>{fmt(totalIva10)}</div>
                  <div className="stat-sub">De {done.filter(i => (i.iva10 ?? 0) > 0).length} facturas</div>
                </div>
              </div>

              <div className="dash-grid">
                <div className="card">
                  <div className="card-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
                    </svg>
                    Gasto por mes (últimos 6 meses)
                  </div>
                  {monthData.length === 0 ? (
                    <div className="empty-dash" style={{ padding: '20px 0' }}>Sin datos de fechas aún</div>
                  ) : (
                    <div className="bar-wrap">
                      {monthData.map((m) => (
                        <div key={m.label} className="bar-col">
                          <div className="bar-val">{m.total > 999 ? `${Math.round(m.total / 1000)}k` : fmt(m.total)}</div>
                          <div className="bar-rect" style={{ height: `${Math.max(4, (m.total / maxMonthTotal) * 100)}px` }} />
                          <div className="bar-label">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                    </svg>
                    Top proveedores por monto
                  </div>
                  {topSuppliers.length === 0 ? (
                    <div className="empty-dash" style={{ padding: '20px 0' }}>Sin datos aún</div>
                  ) : (
                    topSuppliers.map((s) => (
                      <div key={s.proveedor} className="sup-row">
                        <div className="sup-name" title={s.proveedor}>{s.proveedor}</div>
                        <div className="sup-bar-wrap">
                          <div className="sup-bar-fill" style={{ width: `${(s.total / topSuppliers[0].total) * 100}%` }} />
                        </div>
                        <div className="sup-amount">{fmt(s.total)}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="card">
                  <div className="card-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    Desglose de IVA
                  </div>
                  <div className="iva-row">
                    <div className="iva-label">IVA 22%</div>
                    <div className="iva-val" style={{ color: '#1d4ed8' }}>UYU {fmt(totalIva22)}</div>
                  </div>
                  <div className="iva-row">
                    <div className="iva-label">IVA 10%</div>
                    <div className="iva-val" style={{ color: '#0a7c59' }}>UYU {fmt(totalIva10)}</div>
                  </div>
                  <div className="iva-row">
                    <div className="iva-label">Otro IVA</div>
                    <div className="iva-val" style={{ color: 'var(--gray)' }}>UYU {fmt(Math.max(0, totalIva - totalIva10 - totalIva22))}</div>
                  </div>
                  <div className="iva-row" style={{ borderTop: '2px solid var(--border)', marginTop: 4, paddingTop: 12 }}>
                    <div className="iva-label" style={{ fontWeight: 700 }}>Total IVA</div>
                    <div className="iva-val">UYU {fmt(totalIva)}</div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    Resumen general
                  </div>
                  <div className="iva-row">
                    <div className="iva-label">Facturas procesadas</div>
                    <div className="iva-val">{done.length}</div>
                  </div>
                  <div className="iva-row">
                    <div className="iva-label">Proveedores distintos</div>
                    <div className="iva-val">{Object.keys(bySupplier).filter(k => k !== 'Sin proveedor').length}</div>
                  </div>
                  <div className="iva-row">
                    <div className="iva-label">Monto neto total</div>
                    <div className="iva-val">UYU {fmt(totalNeto)}</div>
                  </div>
                  <div className="iva-row">
                    <div className="iva-label">Monto con IVA total</div>
                    <div className="iva-val">UYU {fmt(totalAmount)}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
