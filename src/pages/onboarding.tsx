import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [nombre, setNombre] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      setUser(data.user);
      supabase.from('profiles')
        .select('nombre, onboarding_complete, trial_ends_at')
        .eq('id', data.user.id)
        .single()
        .then(({ data: p }) => {
          if (!p) return;
          if (p.onboarding_complete === true) { router.replace('/app'); return; }
          if (p.nombre) setNombre(p.nombre);
        });
    });
  }, [router]);

  async function start() {
    if (!user) return;
    setSaving(true);
    const updates: Record<string, unknown> = { onboarding_complete: true };
    const { data: p } = await supabase.from('profiles').select('trial_ends_at').eq('id', user.id).single();
    if (!p?.trial_ends_at) {
      updates.subscription_status = 'trial';
      updates.trial_ends_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    }
    await supabase.from('profiles').update(updates).eq('id', user.id);
    router.push('/app');
  }

  if (!user) return null;

  const firstName = nombre.split(' ')[0] || 'ahí';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Figtree', sans-serif; background: #f5f5f7; color: #111; }
        .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; }
        .logo { font-family: 'DM Serif Display', serif; font-size: 26px; color: #0a7c59; margin-bottom: 32px; }
        .card { background: #fff; border: 1px solid #e0e0e0; border-radius: 20px; padding: 40px 36px; width: 100%; max-width: 500px; }
        .icon-wrap { width: 64px; height: 64px; background: #e6f4ef; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .card-title { font-family: 'DM Serif Display', serif; font-size: 28px; line-height: 1.2; margin-bottom: 8px; text-align: center; }
        .card-sub { font-size: 15px; color: #6b6b6b; text-align: center; margin-bottom: 28px; line-height: 1.6; }
        .steps { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }
        .step { display: flex; gap: 14px; align-items: flex-start; }
        .step-num { width: 30px; height: 30px; background: #e6f4ef; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #0a7c59; flex-shrink: 0; }
        .step-text { font-size: 14px; color: #444; line-height: 1.5; padding-top: 5px; }
        .step-text strong { color: #111; }
        .tip { background: #e6f4ef; border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #0a5c44; margin-bottom: 24px; line-height: 1.5; }
        .btn { width: 100%; background: #0a7c59; color: #fff; border: none; padding: 15px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 560px) { .card { padding: 28px 20px; } }
      `}</style>
      <div className="page">
        <div className="logo">ritto</div>
        <div className="card">
          <div className="icon-wrap">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div className="card-title">¡Bienvenido{nombre ? `, ${firstName}` : ''}!</div>
          <div className="card-sub">Esto es todo lo que necesitás saber para empezar.</div>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <div className="step-text"><strong>Subí tus facturas</strong> — arrastrá o seleccioná XMLs de CFE, PDFs o fotos. Se procesan automáticamente.</div>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div className="step-text"><strong>Revisá los datos</strong> — Ritto extrae proveedor, RUT, fecha, montos e IVA. Los podés editar si hace falta.</div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-text"><strong>Exportá</strong> — descargá un Excel o envíá los datos directo a tu Google Sheets con un clic.</div>
            </div>
          </div>
          <div className="tip">
            💡 <strong>Tip:</strong> En <em>Configuración</em> podés conectar Google Sheets y personalizar los nombres de las columnas para que coincidan con tu planilla.
          </div>
          <button className="btn" disabled={saving} onClick={start}>
            {saving ? 'Preparando tu cuenta…' : 'Empezar a usar Ritto →'}
          </button>
        </div>
      </div>
    </>
  );
}
