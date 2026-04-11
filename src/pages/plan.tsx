import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';

const PLANS = {
  pro: {
    name: 'Pro',
    price: '$490',
    period: 'UYU/mes',
    features: [
      'Hasta 100 facturas por mes',
      'Imágenes, PDFs y CFE XML',
      'Exportación a Excel',
      '1 usuario',
      'Soporte por email',
    ],
    // TODO: Reemplazá este link con tu link de cobro de MercadoPago para Plan Pro
    mpLink: 'https://www.mercadopago.com.uy/subscriptions/checkout?preapproval_plan_id=PLAN_PRO',
    color: '#1d4ed8',
    bg: '#eff6ff',
  },
  pyme: {
    name: 'Pyme',
    price: '$1.990',
    period: 'UYU/mes',
    features: [
      'Hasta 500 facturas por mes',
      'Imágenes, PDFs y CFE XML',
      'Exportación a Excel',
      'Hasta 3 usuarios',
      'Soporte prioritario',
    ],
    // TODO: Reemplazá este link con tu link de cobro de MercadoPago para Plan Pyme
    mpLink: 'https://www.mercadopago.com.uy/subscriptions/checkout?preapproval_plan_id=PLAN_PYME',
    color: '#92400e',
    bg: '#fef3c7',
  },
  empresa: {
    name: 'Empresa',
    price: '$4.990',
    period: 'UYU/mes',
    features: [
      'Facturas ilimitadas',
      'Imágenes, PDFs y CFE XML',
      'Exportación a Excel',
      'Usuarios ilimitados',
      'Soporte dedicado 24/7',
      'Integración con sistema contable',
    ],
    // TODO: Reemplazá este link con tu link de cobro de MercadoPago para Plan Empresa
    mpLink: 'https://www.mercadopago.com.uy/subscriptions/checkout?preapproval_plan_id=PLAN_EMPRESA',
    color: '#6b21a8',
    bg: '#f3e8ff',
  },
};

export default function PlanPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [planKey, setPlanKey] = useState<string>('pro');
  const [status, setStatus] = useState<string>('trial');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      setUser(data.user);
      supabase
        .from('profiles')
        .select('plan, subscription_status, trial_ends_at, empresa')
        .eq('id', data.user.id)
        .single()
        .then(({ data: p }) => {
          if (p) {
            if (p.plan) setPlanKey(p.plan);
            if (p.subscription_status) setStatus(p.subscription_status);
            if (p.trial_ends_at) setTrialEndsAt(p.trial_ends_at);
            if (p.empresa) setEmpresa(p.empresa);
          }
          setLoading(false);
        });
    });
  }, [router]);

  if (loading || !user) return null;

  const plan = PLANS[planKey as keyof typeof PLANS] ?? PLANS.pro;
  const isActive = status === 'active';
  const isBlocked = status === 'blocked';

  let trialDaysLeft: number | null = null;
  let trialProgress = 0;
  if (trialEndsAt && status === 'trial') {
    trialDaysLeft = Math.max(
      0,
      Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
    trialProgress = Math.max(0, Math.min(100, ((14 - trialDaysLeft) / 14) * 100));
  }

  const trialEndFormatted = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <>
      <style>{`
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

        .page-wrap { padding: 28px 28px 80px; max-width: 600px; }
        .page-title { font-family: 'DM Serif Display', serif; font-size: 28px; margin-bottom: 6px; }
        .page-sub { font-size: 13px; color: var(--gray); margin-bottom: 28px; }

        /* Status banner */
        .status-banner {
          border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;
          border: 1px solid;
        }
        .status-banner.trial {
          background: #fffbeb; border-color: #fde68a;
        }
        .status-banner.active {
          background: var(--green-light); border-color: rgba(10,124,89,0.25);
        }
        .status-banner.blocked {
          background: var(--red-light); border-color: #fecaca;
        }
        .status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .status-dot.trial { background: #f59e0b; }
        .status-dot.active { background: #22c55e; }
        .status-dot.blocked { background: var(--red); }
        .status-label { font-size: 14px; font-weight: 600; }
        .status-detail { font-size: 13px; color: var(--gray); }
        .progress-track { background: #e5e7eb; border-radius: 99px; height: 6px; margin-top: 12px; overflow: hidden; }
        .progress-fill { height: 100%; background: #f59e0b; border-radius: 99px; transition: width 0.3s; }

        /* Plan card */
        .plan-card {
          background: var(--white); border: 1px solid var(--border);
          border-radius: 14px; padding: 24px; margin-bottom: 16px;
        }
        .plan-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .plan-badge {
          display: inline-block; padding: 4px 12px; border-radius: 20px;
          font-size: 13px; font-weight: 700;
        }
        .plan-name { font-family: 'DM Serif Display', serif; font-size: 22px; }
        .plan-price { font-size: 32px; font-weight: 700; color: var(--dark); line-height: 1; }
        .plan-price span { font-size: 14px; font-weight: 400; color: var(--gray); }
        .features { margin-top: 18px; display: flex; flex-direction: column; gap: 10px; }
        .feature-item { display: flex; align-items: center; gap: 10px; font-size: 14px; }
        .feature-check {
          width: 20px; height: 20px; border-radius: 50%; background: var(--green-light);
          color: var(--green); display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-size: 11px; font-weight: 700;
        }

        /* CTA */
        .cta-card {
          background: var(--white); border: 1px solid var(--border);
          border-radius: 14px; padding: 24px; text-align: center;
        }
        .btn-activate {
          display: inline-flex; align-items: center; gap: 8px;
          background: #009ee3; color: #fff; text-decoration: none;
          padding: 14px 32px; border-radius: 10px;
          font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 700;
          width: 100%; justify-content: center; margin-bottom: 10px;
          transition: background 0.15s; border: none; cursor: pointer;
        }
        .btn-activate:hover { background: #0080c0; }
        .mp-note { font-size: 12px; color: var(--gray); display: flex; align-items: center; justify-content: center; gap: 5px; }
        .cta-divider { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
        .support-link { font-size: 13px; color: var(--gray); text-decoration: none; }
        .support-link:hover { color: var(--green); }

        .active-state { text-align: center; padding: 10px 0; }
        .active-check {
          width: 52px; height: 52px; background: var(--green-light);
          border-radius: 50%; margin: 0 auto 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .active-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .active-sub { font-size: 13px; color: var(--gray); }

        /* Other plans */
        .other-plans-title { font-size: 15px; font-weight: 700; margin: 28px 0 14px; }
        .other-plan-card {
          background: var(--white); border: 1px solid var(--border);
          border-radius: 14px; padding: 20px; margin-bottom: 12px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .op-left { flex: 1; min-width: 0; }
        .op-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .op-badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .op-price { font-size: 18px; font-weight: 700; }
        .op-price span { font-size: 12px; font-weight: 400; color: var(--gray); }
        .op-features { display: flex; flex-direction: column; gap: 4px; }
        .op-feat { font-size: 12px; color: var(--gray); display: flex; align-items: center; gap: 6px; }
        .op-feat-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--border); flex-shrink: 0; }
        .btn-upgrade {
          display: inline-flex; align-items: center; gap: 6px;
          background: #009ee3; color: #fff; text-decoration: none;
          padding: 10px 18px; border-radius: 8px; white-space: nowrap;
          font-family: 'Figtree', sans-serif; font-size: 13px; font-weight: 700;
          transition: background 0.15s; flex-shrink: 0;
        }
        .btn-upgrade:hover { background: #0080c0; }
        @media (max-width: 480px) {
          .other-plan-card { flex-direction: column; align-items: flex-start; }
          .btn-upgrade { width: 100%; justify-content: center; }
        }

        @media (max-width: 768px) {
          .page-wrap { padding: 18px 16px 80px; }
          .page-title { font-size: 22px; }
        }
      `}</style>

      <Sidebar active="plan" userEmail={user.email} empresa={empresa} trialDaysLeft={trialDaysLeft} planName={plan.name} />

      <div className="with-sidebar">
        <div className="page-wrap">
          <h1 className="page-title">Mi Plan</h1>
          <p className="page-sub">Administrá tu suscripción a Ritto</p>

          {/* Status banner */}
          {status === 'trial' && trialDaysLeft != null && (
            <div className="status-banner trial">
              <div className="status-row">
                <span className="status-dot trial" />
                <span className="status-label">Trial activo · {trialDaysLeft} día{trialDaysLeft !== 1 ? 's' : ''} restante{trialDaysLeft !== 1 ? 's' : ''}</span>
              </div>
              <div className="status-detail">
                Tu período gratuito vence el {trialEndFormatted}. Activá tu plan para seguir usando Ritto sin interrupciones.
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${trialProgress}%` }} />
              </div>
            </div>
          )}

          {isBlocked && (
            <div className="status-banner blocked">
              <div className="status-row">
                <span className="status-dot blocked" />
                <span className="status-label">Trial vencido</span>
              </div>
              <div className="status-detail">Tu período gratuito terminó. Activá tu plan para retomar el acceso.</div>
            </div>
          )}

          {isActive && (
            <div className="status-banner active">
              <div className="status-row">
                <span className="status-dot active" />
                <span className="status-label">Plan activo</span>
              </div>
              <div className="status-detail">Tu plan está activo. Gracias por usar Ritto.</div>
            </div>
          )}

          {/* Plan details */}
          <div className="plan-card">
            <div className="plan-header">
              <span
                className="plan-badge"
                style={{ background: plan.bg, color: plan.color }}
              >
                {plan.name}
              </span>
              <div>
                <div className="plan-price">{plan.price} <span>{plan.period}</span></div>
              </div>
            </div>

            <div className="features">
              {plan.features.map((f, i) => (
                <div key={i} className="feature-item">
                  <span className="feature-check">✓</span>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          {!isActive && (
            <div className="cta-card">
              <a
                href={plan.mpLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-activate"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                  <line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Activar Plan {plan.name} · {plan.price}/mes
              </a>
              <div className="mp-note">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                Pago seguro a través de MercadoPago
              </div>
              <hr className="cta-divider" />
              <a href="mailto:soporte@ritto.app" className="support-link">
                ¿Tenés preguntas? Contactá a soporte
              </a>
            </div>
          )}

          {isActive && (
            <div className="plan-card">
              <div className="active-state">
                <div className="active-check">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div className="active-title">Plan activo</div>
                <div className="active-sub">Tu suscripción está al día.</div>
              </div>
            </div>
          )}

          {/* Other plans */}
          {Object.entries(PLANS).filter(([key]) => key !== planKey).length > 0 && (
            <>
              <div className="other-plans-title">
                {isActive ? 'Cambiar de plan' : 'Otros planes disponibles'}
              </div>
              {Object.entries(PLANS)
                .filter(([key]) => key !== planKey)
                .map(([key, p]) => (
                  <div key={key} className="other-plan-card">
                    <div className="op-left">
                      <div className="op-top">
                        <span className="op-badge" style={{ background: p.bg, color: p.color }}>{p.name}</span>
                        <span className="op-price">{p.price} <span>{p.period}</span></span>
                      </div>
                      <div className="op-features">
                        {p.features.slice(0, 3).map((f, i) => (
                          <div key={i} className="op-feat">
                            <span className="op-feat-dot" />
                            {f}
                          </div>
                        ))}
                      </div>
                    </div>
                    <a
                      href={p.mpLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-upgrade"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                        <polyline points="17 6 23 6 23 12"/>
                      </svg>
                      {isActive ? 'Cambiar' : 'Activar'}
                    </a>
                  </div>
                ))}
              <div style={{ fontSize: 12, color: 'var(--gray)', textAlign: 'center', marginTop: 10 }}>
                Para cambiar de plan contactá a{' '}
                <a href="mailto:soporte@ritto.app" style={{ color: 'var(--green)' }}>soporte@ritto.app</a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
