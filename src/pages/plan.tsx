import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';

const PLANS = {
  pro: {
    name: 'Pro',
    price: '$1.500',
    period: 'UYU/mes',
    features: [
      '1 usuario · 1 empresa',
      'Facturas ilimitadas',
      'PDF, imagen y XML CFE',
      'Exportación a Excel y CSV',
      'Soporte por email',
    ],
    color: '#1d4ed8',
    bg: '#eff6ff',
  },
  pyme: {
    name: 'Pyme',
    price: '$5.000',
    period: 'UYU/mes',
    features: [
      'Hasta 5 cuentas · empresas ilimitadas',
      'Facturas ilimitadas',
      'PDF, imagen y XML CFE',
      'Exportación a Excel y CSV',
      'Historial compartido del equipo',
      'Soporte prioritario',
    ],
    color: '#92400e',
    bg: '#fef3c7',
  },
  empresa: {
    name: 'Empresa',
    price: '$12.000',
    period: 'UYU/mes',
    features: [
      'Hasta 20 cuentas · empresas ilimitadas',
      'Facturas ilimitadas',
      'PDF, imagen y XML CFE',
      'Exportación a Excel y CSV',
      'Historial compartido del equipo',
      'Soporte prioritario',
      'Onboarding personalizado',
    ],
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
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  // Payment form state
  const [brickPlan, setBrickPlan] = useState<string | null>(null);
  const [brickPreferenceId, setBrickPreferenceId] = useState<string | null>(null);
  const [brickAmount, setBrickAmount] = useState(0);
  const [brickError, setBrickError] = useState('');
  const brickInstanceRef = useRef<{ unmount: () => void } | null>(null);

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

  useEffect(() => {
    if (router.query.subscribed === '1') {
      setStatus('active');
    }
  }, [router.query]);

  async function handleActivate(key: string) {
    if (!user) return;
    setPaying(true);
    setPayError('');
    setBrickError('');
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: key, email: user.email, userId: user.id }),
      });
      const data = await res.json();
      if (data.preference_id) {
        brickInstanceRef.current?.unmount();
        brickInstanceRef.current = null;
        setBrickPlan(key);
        setBrickAmount(data.amount);
        setBrickPreferenceId(data.preference_id);
        setTimeout(() => {
          document.getElementById('brick-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setPayError(data.error || 'No se pudo iniciar el pago. Escribínos a soporte@ritto.lat');
      }
    } catch {
      setPayError('Error de conexión. Intentá de nuevo.');
    } finally {
      setPaying(false);
    }
  }

  useEffect(() => {
    if (!brickPreferenceId || !user) return;

    const mpPublicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    if (!mpPublicKey) {
      setBrickError('Configuración de pagos pendiente. Contactá soporte@ritto.lat');
      return;
    }

    let cancelled = false;
    let cfInstance: any = null;

    async function initCardForm() {
      if (!(window as any).MercadoPago) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://sdk.mercadopago.com/js/v2';
          s.onload = () => resolve();
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      if (cancelled) return;

      const mp = new (window as any).MercadoPago(mpPublicKey, { locale: 'es-UY' });

      const cf = mp.cardForm({
        amount: String(brickAmount),
        iframe: false,
        form: {
          id: 'form-checkout',
          cardNumber: { id: 'form-checkout__cardNumber', placeholder: '1234 5678 9012 3456' },
          expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/AA' },
          securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVV' },
          cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Nombre como aparece en la tarjeta' },
          issuer: { id: 'form-checkout__issuer' },
          installments: { id: 'form-checkout__installments' },
          identificationType: { id: 'form-checkout__identificationType' },
          identificationNumber: { id: 'form-checkout__identificationNumber', placeholder: 'Número de documento' },
          cardholderEmail: { id: 'form-checkout__cardholderEmail' },
        },
        callbacks: {
          onFormMounted: (error: any) => {
            if (error) setBrickError('Error al cargar el formulario. Recargá la página.');
          },
          onSubmit: async (event: any) => {
            event.preventDefault();
            setBrickError('');
            const {
              paymentMethodId,
              issuerId,
              cardholderEmail,
              amount,
              token,
              installments,
              identificationNumber,
              identificationType,
            } = cf.getCardFormData();
            try {
              const res = await fetch('/api/payments/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  formData: {
                    token,
                    issuer_id: issuerId,
                    payment_method_id: paymentMethodId,
                    transaction_amount: Number(amount),
                    installments: Number(installments),
                    description: `Ritto ${brickPlan}`,
                    payer: {
                      email: cardholderEmail,
                      identification: { type: identificationType, number: identificationNumber },
                    },
                  },
                  userId: user!.id,
                  plan: brickPlan,
                }),
              });
              const result = await res.json();
              if (result.status === 'approved' || result.status === 'in_process') {
                setStatus('active');
                setBrickPreferenceId(null);
              } else {
                setBrickError('El pago no pudo procesarse. Verificá los datos e intentá de nuevo.');
              }
            } catch {
              setBrickError('Error de conexión. Intentá de nuevo.');
            }
          },
          onError: (error: any) => {
            console.error('CardForm error:', error);
          },
        },
      });

      if (cancelled) {
        cf.unmount();
      } else {
        cfInstance = cf;
        brickInstanceRef.current = { unmount: () => cf.unmount() };
      }
    }

    initCardForm();

    return () => {
      cancelled = true;
      cfInstance?.unmount();
      brickInstanceRef.current = null;
    };
  }, [brickPreferenceId, brickAmount, brickPlan, user]);

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
          --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7;
          --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0;
          --white: #ffffff; --red: #dc2626; --red-light: #fef2f2;
        }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page-wrap { padding: 28px 28px 80px; max-width: 600px; }
        .page-title { font-family: 'DM Serif Display', serif; font-size: 28px; margin-bottom: 6px; }
        .page-sub { font-size: 13px; color: var(--gray); margin-bottom: 28px; }
        .status-banner { border-radius: 12px; padding: 18px 20px; margin-bottom: 20px; border: 1px solid; }
        .status-banner.trial { background: #fffbeb; border-color: #fde68a; }
        .status-banner.active { background: var(--green-light); border-color: rgba(10,124,89,0.25); }
        .status-banner.blocked { background: var(--red-light); border-color: #fecaca; }
        .status-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .status-dot.trial { background: #f59e0b; }
        .status-dot.active { background: #22c55e; }
        .status-dot.blocked { background: var(--red); }
        .status-label { font-size: 14px; font-weight: 600; }
        .status-detail { font-size: 13px; color: var(--gray); }
        .progress-track { background: #e5e7eb; border-radius: 99px; height: 6px; margin-top: 12px; overflow: hidden; }
        .progress-fill { height: 100%; background: #f59e0b; border-radius: 99px; transition: width 0.3s; }
        .plan-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 24px; margin-bottom: 16px; }
        .plan-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .plan-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; }
        .plan-price { font-size: 32px; font-weight: 700; color: var(--dark); line-height: 1; }
        .plan-price span { font-size: 14px; font-weight: 400; color: var(--gray); }
        .features { margin-top: 18px; display: flex; flex-direction: column; gap: 10px; }
        .feature-item { display: flex; align-items: center; gap: 10px; font-size: 14px; }
        .feature-check { width: 20px; height: 20px; border-radius: 50%; background: var(--green-light); color: var(--green); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; font-weight: 700; }
        .cta-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 24px; text-align: center; }
        .btn-activate { display: inline-flex; align-items: center; gap: 8px; background: #009ee3; color: #fff; padding: 14px 32px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 700; width: 100%; justify-content: center; margin-bottom: 10px; transition: background 0.15s; border: none; cursor: pointer; }
        .btn-activate:hover:not(:disabled) { background: #0080c0; }
        .btn-activate:disabled { opacity: 0.7; cursor: not-allowed; }
        .mp-note { font-size: 12px; color: var(--gray); display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 10px; }
        .trial-note { font-size: 12px; color: #0a5c44; background: var(--green-light); border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; }
        .cta-divider { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
        .support-link { font-size: 13px; color: var(--gray); text-decoration: none; }
        .support-link:hover { color: var(--green); }
        .brick-section { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 24px; margin-bottom: 16px; }
        .brick-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .brick-title { font-size: 16px; font-weight: 700; }
        .btn-close-brick { background: none; border: none; cursor: pointer; color: var(--gray); font-size: 22px; line-height: 1; padding: 0 4px; }
        .btn-close-brick:hover { color: var(--dark); }
        .brick-error { color: #dc2626; font-size: 13px; margin-top: 12px; padding: 10px 12px; background: #fef2f2; border-radius: 8px; }
        .cf-input { width: 100%; padding: 11px 14px; border: 1px solid var(--border); border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 14px; color: var(--dark); background: var(--white); outline: none; transition: border-color 0.15s; }
        .cf-input:focus { border-color: #009ee3; }
        .cf-input::placeholder { color: #aaa; }
        .active-state { text-align: center; padding: 10px 0; }
        .active-check { width: 52px; height: 52px; background: var(--green-light); border-radius: 50%; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; }
        .active-title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        .active-sub { font-size: 13px; color: var(--gray); }
        .other-plans-title { font-size: 15px; font-weight: 700; margin: 28px 0 14px; }
        .other-plan-card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 20px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .op-left { flex: 1; min-width: 0; }
        .op-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .op-badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .op-price { font-size: 18px; font-weight: 700; }
        .op-price span { font-size: 12px; font-weight: 400; color: var(--gray); }
        .op-features { display: flex; flex-direction: column; gap: 4px; }
        .op-feat { font-size: 12px; color: var(--gray); display: flex; align-items: center; gap: 6px; }
        .op-feat-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--border); flex-shrink: 0; }
        .btn-upgrade { display: inline-flex; align-items: center; background: #009ee3; color: #fff; padding: 10px 18px; border-radius: 8px; white-space: nowrap; font-family: 'Figtree', sans-serif; font-size: 13px; font-weight: 700; transition: background 0.15s; flex-shrink: 0; border: none; cursor: pointer; }
        .btn-upgrade:hover:not(:disabled) { background: #0080c0; }
        .btn-upgrade:disabled { opacity: 0.7; cursor: not-allowed; }
        @media (max-width: 480px) { .other-plan-card { flex-direction: column; align-items: flex-start; } .btn-upgrade { width: 100%; justify-content: center; } }
        @media (max-width: 768px) { .page-wrap { padding: 18px 16px 80px; } .page-title { font-size: 22px; } }
      `}</style>

      <Sidebar active="plan" userEmail={user.email} empresa={empresa} trialDaysLeft={trialDaysLeft} planName={plan.name} />

      <div className="with-sidebar">
        <div className="page-wrap">
          <h1 className="page-title">Mi Plan</h1>
          <p className="page-sub">Administrá tu suscripción a Ritto</p>

          {status === 'trial' && trialDaysLeft != null && (
            <div className="status-banner trial">
              <div className="status-row">
                <span className="status-dot trial" />
                <span className="status-label">Trial activo · {trialDaysLeft} día{trialDaysLeft !== 1 ? 's' : ''} restante{trialDaysLeft !== 1 ? 's' : ''}</span>
              </div>
              <div className="status-detail">
                Tu período gratuito vence el {trialEndFormatted}. Suscribíte antes para no perder el acceso.
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
              <div className="status-detail">Tu período gratuito terminó. Suscribíte para retomar el acceso.</div>
            </div>
          )}

          {isActive && (
            <div className="status-banner active">
              <div className="status-row">
                <span className="status-dot active" />
                <span className="status-label">Plan activo</span>
              </div>
              <div className="status-detail">Tu suscripción está al día. El cobro es automático cada mes.</div>
            </div>
          )}

          <div className="plan-card">
            <div className="plan-header">
              <span className="plan-badge" style={{ background: plan.bg, color: plan.color }}>{plan.name}</span>
              <div className="plan-price">{plan.price} <span>{plan.period}</span></div>
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

          {brickPreferenceId && (
            <div className="brick-section" id="brick-section">
              <div className="brick-header">
                <span className="brick-title">Completá tu pago</span>
                <button className="btn-close-brick" onClick={() => { brickInstanceRef.current?.unmount(); brickInstanceRef.current = null; setBrickPreferenceId(null); setBrickError(''); }}>×</button>
              </div>
              <form id="form-checkout" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input type="text" id="form-checkout__cardNumber" placeholder="Número de tarjeta" className="cf-input" />
                <div style={{ display: 'flex', gap: 12 }}>
                  <input type="text" id="form-checkout__expirationDate" placeholder="MM/AA" className="cf-input" style={{ flex: 1 }} />
                  <input type="text" id="form-checkout__securityCode" placeholder="CVV" className="cf-input" style={{ flex: 1 }} />
                </div>
                <input type="text" id="form-checkout__cardholderName" placeholder="Nombre en la tarjeta" className="cf-input" />
                <input type="email" id="form-checkout__cardholderEmail" placeholder="Email" defaultValue={user.email ?? ''} className="cf-input" />
                <div style={{ display: 'flex', gap: 12 }}>
                  <select id="form-checkout__identificationType" className="cf-input" style={{ flex: '0 0 120px' }} />
                  <input type="text" id="form-checkout__identificationNumber" placeholder="Número de documento" className="cf-input" style={{ flex: 1 }} />
                </div>
                <select id="form-checkout__issuer" style={{ display: 'none' }} />
                <select id="form-checkout__installments" style={{ display: 'none' }} />
                <button type="submit" className="btn-activate" style={{ marginBottom: 0 }}>Pagar · {brickPlan ? PLANS[brickPlan as keyof typeof PLANS]?.price : ''} UYU/mes</button>
              </form>
              {brickError && <div className="brick-error">{brickError}</div>}
            </div>
          )}

          {!isActive && (
            <div className="cta-card">
              <div className="trial-note">
                ✓ 14 días de prueba gratis · sin tarjeta hasta que venza el trial
              </div>
              <button className="btn-activate" disabled={paying} onClick={() => handleActivate(planKey)}>
                {paying ? 'Cargando…' : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    Suscribirme · {plan.price}/mes
                  </>
                )}
              </button>
              {payError && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{payError}</div>}
              <div className="mp-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Pago seguro con MercadoPago · Cancelá cuando quieras
              </div>
              <hr className="cta-divider" />
              <a href="mailto:soporte@ritto.lat" className="support-link">¿Tenés preguntas? Contactá a soporte</a>
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
                <div className="active-sub">Tu suscripción se renueva automáticamente cada mes.</div>
              </div>
            </div>
          )}

          {Object.entries(PLANS).filter(([key]) => key !== planKey).length > 0 && (
            <>
              <div className="other-plans-title">{isActive ? 'Cambiar de plan' : 'Otros planes'}</div>
              {Object.entries(PLANS).filter(([key]) => key !== planKey).map(([key, p]) => (
                <div key={key} className="other-plan-card">
                  <div className="op-left">
                    <div className="op-top">
                      <span className="op-badge" style={{ background: p.bg, color: p.color }}>{p.name}</span>
                      <span className="op-price">{p.price} <span>{p.period}</span></span>
                    </div>
                    <div className="op-features">
                      {p.features.slice(0, 3).map((f, i) => (
                        <div key={i} className="op-feat"><span className="op-feat-dot" />{f}</div>
                      ))}
                    </div>
                  </div>
                  <button className="btn-upgrade" disabled={paying} onClick={() => handleActivate(key)}>
                    {isActive ? 'Cambiar' : 'Contratar'}
                  </button>
                </div>
              ))}
              <div style={{ fontSize: 12, color: 'var(--gray)', textAlign: 'center', marginTop: 10 }}>
                Para cambiar de plan contactá a{' '}
                <a href="mailto:soporte@ritto.lat" style={{ color: 'var(--green)' }}>soporte@ritto.lat</a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
