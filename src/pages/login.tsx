import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup';
type Plan = 'pro' | 'pyme' | 'empresa';

const PLANS: { id: Plan; name: string; price: string; desc: string; features: string[] }[] = [
  {
    id: 'pro',
    name: 'Pro',
    price: '$490',
    desc: 'UYU/mes · 1 usuario',
    features: ['1 usuario', 'Facturas ilimitadas', 'Exportación a Excel', '1 empresa'],
  },
  {
    id: 'pyme',
    name: 'Pyme',
    price: '$1.990',
    desc: 'UYU/mes · hasta 5 usuarios',
    features: ['Hasta 5 usuarios', 'Facturas ilimitadas', 'Exportación a Excel', 'Multi-empresa', 'Soporte prioritario'],
  },
  {
    id: 'empresa',
    name: 'Empresa',
    price: '$4.990',
    desc: 'UYU/mes · hasta 20 usuarios',
    features: ['Hasta 20 usuarios', 'Facturas ilimitadas', 'Exportación a Excel', 'Multi-empresa', 'Soporte prioritario', 'Onboarding personalizado'],
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<1 | 2>(1); // step 2 = plan selection
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan>('pyme');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
      });
      if (data.session) {
        router.push('/app');
      } else {
        setSuccess('¡Cuenta creada! Revisá tu email para confirmar y después iniciá sesión.');
        setStep(1);
      }
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

        /* Step 1 card */
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
        .section-label { font-size: 11px; font-weight: 600; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; margin-top: 4px; }

        /* Step 2 - plan selection */
        .plan-wrap { width: 100%; max-width: 780px; }
        .plan-title { font-family: 'DM Serif Display', serif; font-size: 26px; text-align: center; margin-bottom: 6px; }
        .plan-sub { text-align: center; color: var(--gray); font-size: 14px; margin-bottom: 28px; }
        .plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
        .plan-card {
          background: var(--white);
          border: 2px solid var(--border);
          border-radius: 14px;
          padding: 22px 18px;
          cursor: pointer;
          transition: border-color 0.15s;
          position: relative;
        }
        .plan-card.selected { border-color: var(--green); }
        .plan-card.popular::before {
          content: 'Más popular';
          position: absolute;
          top: -11px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--green);
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 12px;
          border-radius: 20px;
          white-space: nowrap;
        }
        .plan-name { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
        .plan-price { font-family: 'DM Serif Display', serif; font-size: 32px; line-height: 1; margin: 8px 0 2px; }
        .plan-period { font-size: 12px; color: var(--gray); margin-bottom: 14px; }
        .plan-features { list-style: none; }
        .plan-features li { font-size: 13px; color: var(--gray); padding: 4px 0; display: flex; gap: 6px; }
        .plan-features li::before { content: '✓'; color: var(--green); font-weight: 700; flex-shrink: 0; }
        .trial-badge {
          background: var(--green-light);
          color: var(--green);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
          text-align: center;
          margin-bottom: 16px;
        }
        .plan-actions { display: flex; gap: 10px; }
        .btn-back { background: none; border: 1.5px solid var(--border); color: var(--dark); padding: 12px 20px; border-radius: 9px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; }
        .btn-start { flex: 1; background: var(--green); color: #fff; border: none; padding: 13px; border-radius: 9px; font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; }
        .btn-start:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 640px) {
          .plan-grid { grid-template-columns: 1fr; }
          .card { padding: 24px 18px; }
          .field-row { grid-template-columns: 1fr; gap: 0; }
        }
      `}</style>

      <div className="page">
        <div className="logo" onClick={() => router.push('/')}>Ritto</div>

        {/* STEP 1: datos personales / login */}
        {step === 1 && (
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
          </div>
        )}

        {/* STEP 2: elegir plan */}
        {step === 2 && (
          <div className="plan-wrap">
            <h1 className="plan-title">Elegí tu plan</h1>
            <p className="plan-sub">14 días gratis · Sin tarjeta de crédito · Cancelás cuando quieras</p>

            {error && <div className="error" style={{ maxWidth: 420, margin: '0 auto 16px' }}>{error}</div>}

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

            <div className="trial-badge">
              Tu trial de 14 días arranca hoy con el plan <strong>{PLANS.find(p => p.id === selectedPlan)?.name}</strong> — después podés cambiar o cancelar.
            </div>

            <div className="plan-actions">
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
