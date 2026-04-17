import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';

const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/>
      </svg>
    ),
    title: 'XML, PDF o foto — funciona con todo',
    desc: 'Subí el CFE en XML para resultados instantáneos. ¿No tenés XML? Sacá una foto o subí el PDF — la IA extrae los datos igual.',
    badge: 'Más rápido',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
      </svg>
    ),
    title: 'Exportá listo para tu sistema contable',
    desc: 'Un clic y tenés el Excel formateado para GNS Contable, ZetaSoftware o Siigo. Sin copiar a mano, sin errores de tipeo.',
    badge: 'Ahorro de tiempo',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    title: 'Varios usuarios, un solo historial',
    desc: 'Con el plan Pyme o Empresa, tu contador y tu encargado ven exactamente lo mismo. Sin mails con archivos, sin versiones duplicadas.',
    badge: 'Para equipos',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'Dashboard con tus gastos en tiempo real',
    desc: 'Ves cuánto gastaste por mes, qué proveedor te cobra más y cómo se divide el IVA. Todo sin abrir una sola planilla.',
    badge: 'Control total',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: 'Tus datos están seguros',
    desc: 'Almacenamiento cifrado en Supabase. Nadie más ve tus facturas. No vendemos ni compartimos tu información fiscal.',
    badge: 'Privacidad',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
      </svg>
    ),
    title: 'Hecho para Uruguay',
    desc: 'Entiende el formato CFE de DGI, reconoce los campos de facturas uruguayas (neto, IVA 10%/22%, e-Ticket) y exporta en pesos uruguayos.',
    badge: 'Local',
  },
];

export default function BeneficiosPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
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
    });
  }, [router]);

  if (!user) return null;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7; --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0; --white: #ffffff; }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page-wrap { padding: 28px 28px 80px; max-width: 960px; }
        .page-title { font-family: 'DM Serif Display', serif; font-size: 30px; color: var(--dark); line-height: 1.2; margin-bottom: 8px; }
        .page-sub { font-size: 15px; color: var(--gray); margin-bottom: 36px; line-height: 1.6; max-width: 560px; }
        .features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-bottom: 40px; }
        .feat-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 22px 22px 20px; display: flex; flex-direction: column; gap: 10px; }
        .feat-top { display: flex; align-items: center; justify-content: space-between; }
        .feat-icon { width: 44px; height: 44px; background: var(--green-light); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .feat-badge { background: #dcfce7; color: #166534; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
        .feat-title { font-size: 15px; font-weight: 700; color: var(--dark); line-height: 1.3; }
        .feat-desc { font-size: 13px; color: var(--gray); line-height: 1.6; }
        .cta-block { background: linear-gradient(135deg, #0a7c59, #0d9b71); border-radius: 16px; padding: 30px 28px; color: #fff; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
        .cta-title { font-family: 'DM Serif Display', serif; font-size: 22px; margin-bottom: 6px; }
        .cta-sub { font-size: 14px; opacity: 0.8; }
        .btn-cta { background: #fff; color: var(--green); padding: 12px 24px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 700; text-decoration: none; white-space: nowrap; flex-shrink: 0; display: inline-block; }
        @media (max-width: 720px) { .features-grid { grid-template-columns: 1fr; } .page-wrap { padding: 18px 16px 80px; } }
      `}</style>

      <Sidebar active="beneficios" userEmail={user.email} empresa={empresa} trialDaysLeft={trialDaysLeft} planName={planName} />

      <div className="with-sidebar">
        <div className="page-wrap">
          <h1 className="page-title">¿Para qué sirve Ritto?</h1>
          <p className="page-sub">
            Ritto toma tus facturas — en cualquier formato — y las convierte en datos listos para tu contador o sistema contable. Sin tipeo, sin Excel manual, sin errores.
          </p>

          <div className="features-grid">
            {features.map((f) => (
              <div key={f.title} className="feat-card">
                <div className="feat-top">
                  <div className="feat-icon">{f.icon}</div>
                  <span className="feat-badge">{f.badge}</span>
                </div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="cta-block">
            <div>
              <div className="cta-title">¿Querés sacarle más provecho?</div>
              <div className="cta-sub">Leé la guía paso a paso o mirá tus estadísticas en el dashboard.</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href="/guia" className="btn-cta">Ver guía →</a>
              <a href="/dashboard" className="btn-cta" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>Dashboard →</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
