import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup';
type Plan = 'pro' | 'pyme' | 'empresa';
type Sistema = 'gns' | 'zeta' | 'siigo';

const PLANS: { id: Plan; name: string; price: string; desc: string; features: string[] }[] = [
  {
    id: 'pro',
    name: 'Pro',
    price: '$490',
    desc: 'UYU/mes · 1 usuario · 1 empresa',
    features: ['1 usuario', '1 empresa', 'Facturas ilimitadas', 'Exportación a Excel y CSV', 'Soporte por email'],
  },
  {
    id: 'pyme',
    name: 'Pyme',
    price: '$1.990',
    desc: 'UYU/mes · hasta 5 usuarios',
    features: ['Hasta 5 usuarios', '1 empresa compartida', 'Facturas ilimitadas', 'Exportación a Excel y CSV', 'Soporte prioritario'],
  },
  {
    id: 'empresa',
    name: 'Empresa',
    price: '$4.990',
    desc: 'UYU/mes · hasta 20 usuarios',
    features: ['Hasta 20 usuarios', '1 empresa compartida', 'Facturas ilimitadas', 'Exportación a Excel y CSV', 'Soporte prioritario', 'Onboarding personalizado'],
  },
];

const SISTEMAS: { id: Sistema; name: string; desc: string }[] = [
  { id: 'gns', name: 'GNS Contable', desc: 'Gestión de Importaciones' },
  { id: 'zeta', name: 'ZetaSoftware', desc: 'Importación de comprobantes XLS' },
  { id: 'siigo', name: 'Siigo', desc: 'Importación de comprobantes contables' },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan>('pyme');
  const [selectedSistema, setSelectedSistema] = useState<Sistema>('gns');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (router.query.signup === 'true') setMode('signup');
  }, [router.query.signup]);

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (mode === 'login') {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError('Email o contraseña incorrectos.');
      else router.push('/app');
      setLoading(false);
    } else {
      setStep(2);
    }
  }

  async function handleSignup() {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data.user) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);
      await supabase.from('profiles').upsert({
        id: data.user.id,
        nombre,
        empresa,
        rut: rut || null,
        telefono: telefono || null,
        plan: selectedPlan,
        sistema_contable: selectedSistema,
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
      });
      // send welcome email (fire and forget)
      fetch('/api/send-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nombre, plan: selectedPlan, sistema: selectedSistema }),
      }).catch(() => {});

      router.push('/app');
    }
    setLoading(false);
  }

  function switchMode(m: Mode) {
    setMode(m);
    setStep(1);
    setError('');
    setSuccess('');
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7;
          --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0;
          --white: #ffffff; --red: #dc2626;
        }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
        .logo { font-family: 'DM Serif Display', serif; font-size: 28px; color: var(--green); margin-bottom: 28px; cursor: pointer; }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 32px 28px; width: 100%; max-width: 420px; }
        .card-title { font-family: 'DM Serif Display', serif; font-size: 22px; margin-bottom: 4px; }
        .card-sub { font-size: 14px; color: var(--gray); margin-bottom: 24px; }
        .field { margin-bottom: 14px; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 5px; }
        .optional { color: var(--gray); font-weight: 400; font-size: 11px; margin-left: 4px; }
        input[type="email"], input[type="password"], input[type="text"], input[type="tel"] {
          width: 100%; padding: 10px 13px; border: 1px solid var(--border);
          border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 15px;
          outline: none; transition: border-color 0.15s;
        }
        input:focus { border-color: var(--green); }
        .divider { display: flex; align-items: center; gap: 10px; margin: 16px 0; color: var(--gray); font-size: 12px; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
        .btn-submit { width: 100%; background: var(--green); color: #fff; border: none; padding: 13px; border-radius: 9px; font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 4px; }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .error { background: #fef2f2; border: 1px solid #fecaca; color: var(--red); border-radius: 8px; padding: 10px 13px; font-size: 13px; margin-bottom: 14px; }
        .success-msg { background: var(--green-light); border: 1px solid rgba(10,124,89,0.25); color: var(--green); border-radius: 8px; padding: 10px 13px; font-size: 13px; margin-bottom: 14px; }
        .toggle { text-align: center; margin-top: 18px; font-size: 13px; color: var(--gray); }
        .toggle button { background: none; border: none; color: var(--green); font-weight: 600; cursor: pointer; font-family: 'Figtree', sans-serif; font-size: 13px; }
        .section-label { font-size: 11px; font-weight: 600; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; }
        .step2-wrap { width: 100%; max-width: 820px; }
        .step2-title { font-family: 'DM Serif Display', serif; font-size: 26px; text-align: center; margin-bottom: 6px; }
        .step2-sub { text-align: center; color: var(--gray); font-size: 14px; margin-bottom: 28px; }
        .plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
        .plan-card {
          background: var(--white); border: 2px solid var(--border);
          border-radius: 14px; padding: 22px 18px;
          cursor: pointer; transition: border-color 0.15s; position: relative;
        }
        .plan-card.selected { border-color: var(--green); }
        .plan-card.popular::before {
          content: 'Más popular'; position: absolute; top: -11px; left: 50%;
          transform: translateX(-50%); background: var(--green); color: #fff;
          font-size: 11px; font-weight: 600; padding: 3px 12px; border-radius: 20px; white-space: nowrap;
        }
        .plan-name { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
        .plan-price { font-family: 'DM Serif Display', serif; font-size: 30px; line-height: 1; margin: 8px 0 2px; }
        .plan-period { font-size: 12px; color: var(--gray); margin-bottom: 14px; }
        .plan-features { list-style: none; }
        .plan-features li { font-size: 13px; color: var(--gray); padding: 3px 0; display: flex; gap: 6px; }
        .plan-features li::before { content: '✓'; color: var(--green); font-weight: 700; flex-shrink: 0; }
        .sistema-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .sistema-card {
          background: var(--white); border: 2px solid var(--border);
          border-radius: 12px; padding: 18px 14px; cursor: pointer;
          transition: border-color 0.15s, background 0.15s; text-align: center;
        }
        .sistema-card.selected { border-color: var(--green); background: var(--green-light); }
        .s-name { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
        .s-desc { font-size: 11px; color: var(--gray); line-height: 1.3; }
        .sistema-card.selected .s-desc { color: var(--green); }
        .trial-badge {
          background: var(--green-light); color: var(--green);
          border-radius: 8px; padding: 10px 14px; font-size: 13px;
          font-weight: 500; text-align: center; margin-bottom: 16px;
        }
        .step2-actions { display: flex; gap: 10px; }
        .btn-back { background: none; border: 1.5px solid var(--border); color: var(--dark); padding: 12px 20px; border-radius: 9px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; }
        .btn-start { flex: 1; background: var(--green); color: #fff; border: none; padding: 13px; border-radius: 9px; font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; }
        .btn-start:disabled { opacity: 0.6; cursor: not-allowed; }
        @media (max-width: 680px) {
          .plan-grid, .sistema-grid { grid-template-columns: 1fr; }
          .card { padding: 24px 18px; }
          .field-row { grid-template-columns: 1fr; gap: 0; }
        }
      `}</style>

      <div className="page">
        <div className="logo" onClick={() => router.push('/')}>ritto</div>

        {registered && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: 'var(--green-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: 8 }}>Revisá tu email</h2>
            <p style={{ fontSize: 14, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 24 }}>
              Te mandamos un link de confirmación a <strong style={{ color: 'var(--dark)' }}>{email}</strong>.<br />
              Hacé click en el link y después iniciá sesión.
            </p>
            <button
              className="btn-primary"
              onClick={() => { setRegistered(false); setMode('login'); setStep(1); }}
            >
              Ir a iniciar sesión
            </button>
          </div>
        )}

        {!registered && step === 1 && (
          <div className="card">
            <h1 className="card-title">{mode === 'login' ? 'Iniciá sesión' : 'Crear cuenta'}</h1>
            <p className="card-sub">{mode === 'login' ? 'Bienvenido de vuelta' : '14 días gratis, sin tarjeta de crédito'}</p>
            {error && <div className="error">{error}</div>}
            {success && <div className="success-msg">{success}</div>}
            <form onSubmit={handleStep1}>
              {mode === 'signup' && (
                <>
                  <div className="section-label">Datos personales</div>
                  <div className="field">
                    <label>Nombre completo</label>
                    <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} required placeholder="Juan García" />
                  </div>
                  <div className="section-label">Datos de la empresa</div>
                  <div className="field">
                    <label>Nombre de la empresa</label>
                    <input type="text" value={empresa} onChange={(e) => setEmpresa(e.target.value)} required placeholder="Mi Empresa SA" />
                  </div>
                  <div className="field-row">
                    <div>
                      <label>RUT <span className="optional">opcional</span></label>
                      <input type="text" value={rut} onChange={(e) => setRut(e.target.value)} placeholder="21.234.567-8" />
                    </div>
                    <div>
                      <label>Teléfono <span className="optional">opcional</span></label>
                      <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+598 99 123 456" />
                    </div>
                  </div>
                  <div className="divider">acceso</div>
                </>
              )}
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="tu@empresa.com" />
              </div>
              <div className="field">
                <label>Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
              </div>
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? 'Cargando…' : mode === 'login' ? 'Ingresar' : 'Elegir plan →'}
              </button>
            </form>
            <div className="toggle">
              {mode === 'login'
                ? <>¿No tenés cuenta? <button onClick={() => switchMode('signup')}>Registrate gratis</button></>
                : <>¿Ya tenés cuenta? <button onClick={() => switchMode('login')}>Iniciá sesión</button></>}
            </div>
            {mode === 'login' && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <button
                  onClick={() => router.push('/forgot-password')}
                  style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Olvidé mi contraseña
                </button>
              </div>
            )}
          </div>
        )}

        {!registered && step === 2 && (
          <div className="step2-wrap">
            <h1 className="step2-title">Configurá tu cuenta</h1>
            <p className="step2-sub">14 días gratis · Sin tarjeta de crédito · Cancelás cuando quieras</p>
            {error && <div className="error" style={{ maxWidth: 420, margin: '0 auto 16px' }}>{error}</div>}

            <div className="section-label">Elegí tu plan</div>
            <div className="plan-grid">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`plan-card${plan.id === 'pyme' ? ' popular' : ''}${selectedPlan === plan.id ? ' selected' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div className="plan-name">{plan.name}</div>
                  <div className="plan-price">{plan.price}</div>
                  <div className="plan-period">{plan.desc}</div>
                  <ul className="plan-features">
                    {plan.features.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              ))}
            </div>

            <div className="section-label">¿Qué sistema contable usás?</div>
            <div className="sistema-grid">
              {SISTEMAS.map((s) => (
                <div
                  key={s.id}
                  className={`sistema-card${selectedSistema === s.id ? ' selected' : ''}`}
                  onClick={() => setSelectedSistema(s.id)}
                >
                  <div className="s-name">{s.name}</div>
                  <div className="s-desc">{s.desc}</div>
                </div>
              ))}
            </div>

            <div className="trial-badge">
              Plan <strong>{PLANS.find(p => p.id === selectedPlan)?.name}</strong> · Excel listo para <strong>{SISTEMAS.find(s => s.id === selectedSistema)?.name}</strong> · 14 días gratis
            </div>
            <div className="step2-actions">
              <button className="btn-back" onClick={() => setStep(1)}>← Atrás</button>
              <button className="btn-start" onClick={handleSignup} disabled={loading}>
                {loading ? 'Creando cuenta…' : 'Empezar trial gratis'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
