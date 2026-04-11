import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const PLAN_NAMES: Record<string, string> = { pro: 'Pro', pyme: 'Pyme', empresa: 'Empresa' };
const PLAN_PRICES: Record<string, string> = { pro: '$490', pyme: '$1.990', empresa: '$4.990' };

export default function BlockedPage() {
  const router = useRouter();
  const [plan, setPlan] = useState('');
  const [trialEnd, setTrialEnd] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      supabase.from('profiles').select('plan, trial_ends_at').eq('id', data.user.id).single()
        .then(({ data: p }) => {
          if (p) {
            setPlan(p.plan ?? 'pro');
            if (p.trial_ends_at) {
              setTrialEnd(new Date(p.trial_ends_at).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' }));
            }
          }
        });
    });
  }, [router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7; --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0; --white: #ffffff; }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .nav { background: rgba(245,245,247,0.95); backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; height: 54px; }
        .logo { font-family: 'DM Serif Display', serif; font-size: 20px; color: var(--green); }
        .btn-out { background: none; border: 1px solid var(--border); padding: 6px 14px; border-radius: 7px; font-family: 'Figtree', sans-serif; font-size: 13px; cursor: pointer; color: var(--gray); }
        .page { min-height: calc(100vh - 54px); display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 20px; padding: 48px 36px; max-width: 440px; width: 100%; text-align: center; }
        .icon { width: 64px; height: 64px; background: #fef3c7; border-radius: 16px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; font-size: 32px; }
        .title { font-family: 'DM Serif Display', serif; font-size: 26px; margin-bottom: 12px; }
        .desc { color: var(--gray); font-size: 15px; line-height: 1.6; margin-bottom: 28px; }
        .plan-box { background: var(--bg); border-radius: 12px; padding: 16px; margin-bottom: 24px; }
        .plan-box .plan-name { font-weight: 600; font-size: 16px; margin-bottom: 2px; }
        .plan-box .plan-price { font-family: 'DM Serif Display', serif; font-size: 36px; color: var(--green); }
        .plan-box .plan-period { font-size: 13px; color: var(--gray); }
        .btn-pay { width: 100%; background: var(--green); color: #fff; border: none; padding: 14px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 16px; font-weight: 600; cursor: pointer; margin-bottom: 12px; }
        .btn-contact { width: 100%; background: none; border: 1.5px solid var(--border); color: var(--dark); padding: 13px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 500; cursor: pointer; }
        .trial-info { font-size: 12px; color: var(--gray); margin-top: 16px; }
        @media (max-width: 480px) { .card { padding: 32px 20px; } }
      `}</style>

      <nav className="nav">
        <div className="logo">ritto</div>
        <button className="btn-out" onClick={handleSignOut}>Cerrar sesión</button>
      </nav>

      <div className="page">
        <div className="card">
          <div className="icon">⏰</div>
          <h1 className="title">Tu trial terminó</h1>
          <p className="desc">
            Tus 14 días de prueba vencieron{trialEnd ? ` el ${trialEnd}` : ''}. Para seguir usando Ritto activá tu plan.
          </p>

          {plan && (
            <div className="plan-box">
              <div className="plan-name">Plan {PLAN_NAMES[plan]}</div>
              <div className="plan-price">{PLAN_PRICES[plan]}</div>
              <div className="plan-period">UYU / mes</div>
            </div>
          )}

          <button className="btn-pay" onClick={() => router.push('/plan')}>
            Ver planes y activar
          </button>
          <button className="btn-contact" onClick={() => window.location.href = 'mailto:soporte@ritto.app'}>
            Hablar con soporte
          </button>
          <p className="trial-info">¿Necesitás más tiempo? Escribinos y lo arreglamos.</p>
        </div>
      </div>
    </>
  );
}
