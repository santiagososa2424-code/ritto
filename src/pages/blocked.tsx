import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const PLAN_PRICES: Record<string, string> = {
  pro: '$1.500',
  pyme: '$5.000',
  empresa: '$12.000',
};

export default function BlockedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [userPlan, setUserPlan] = useState<string>('pro');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      setUser(data.user);
      supabase.from('profiles').select('subscription_status, trial_ends_at, plan').eq('id', data.user.id).single()
        .then(({ data: p }) => {
          if (p?.subscription_status === 'active') router.replace('/app');
          if (p?.plan) setUserPlan(p.plan);
        });
    });
  }, [router]);

  async function handleSubscribe() {
    if (!user) return;
    setPaying(true);
    setError('');
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: userPlan, email: user.email, userId: user.id }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setError('No se pudo iniciar el pago. Escribínos a soporte@ritto.lat');
      }
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Figtree', sans-serif; background: #f5f5f7; color: #111; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .card { background: #fff; border: 1px solid #e0e0e0; border-radius: 20px; padding: 40px 36px; max-width: 440px; width: 100%; text-align: center; }
        .icon { width: 64px; height: 64px; background: #fef2f2; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .title { font-family: 'DM Serif Display', serif; font-size: 26px; margin-bottom: 10px; }
        .sub { font-size: 15px; color: #6b6b6b; line-height: 1.6; margin-bottom: 28px; }
        .btn { width: 100%; background: #009ee3; color: #fff; border: none; padding: 14px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; transition: background 0.15s; }
        .btn:hover:not(:disabled) { background: #0080c0; }
        .btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .note { font-size: 12px; color: #6b6b6b; margin-top: 10px; }
        .support { font-size: 13px; color: #6b6b6b; margin-top: 16px; }
        .support a { color: #0a7c59; text-decoration: none; }
        .err { color: #dc2626; font-size: 13px; margin-top: 8px; }
      `}</style>
      <div className="card">
        <div className="icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div className="title">Tu trial terminó</div>
        <div className="sub">
          Los 14 días de prueba gratuita llegaron a su fin. Elegí un plan para seguir usando Ritto — el primer cobro es dentro de un mes.
        </div>
        <button className="btn" disabled={paying} onClick={handleSubscribe}>
          {paying ? 'Redirigiendo…' : `Suscribirme ahora · ${PLAN_PRICES[userPlan] ?? '$1.500'}/mes`}
        </button>
        {error && <div className="err">{error}</div>}
        <div className="note">Pago seguro con MercadoPago · Cancelá cuando quieras</div>
        <div className="support">
          ¿Preguntas? <a href="mailto:soporte@ritto.lat">soporte@ritto.lat</a>
        </div>
      </div>
    </>
  );
}
