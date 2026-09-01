import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function JoinPage() {
  const router = useRouter();
  const { token } = router.query;
  const [state, setState] = useState<'loading' | 'ready' | 'needsLogin' | 'accepting' | 'success' | 'error'>('loading');
  const [orgName, setOrgName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/org/invite-info?token=${token}`)
      .then(r => r.json())
      .then(async (d) => {
        if (d.error) { setState('error'); setErrorMsg(d.error); return; }
        setOrgName(d.orgName);
        setInviteEmail(d.email ?? '');
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          setUserId(data.user.id);
          setState('ready');
        } else {
          setState('needsLogin');
        }
      })
      .catch(() => { setState('error'); setErrorMsg('Error de conexión'); });
  }, [token]);

  async function accept() {
    if (!userId || !token) return;
    setState('accepting');
    const res = await fetch('/api/org/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId }),
    });
    if (res.ok) {
      setState('success');
      setTimeout(() => router.push('/app'), 2500);
    } else {
      const d = await res.json();
      setErrorMsg(d.error ?? 'Error al aceptar la invitación');
      setState('error');
    }
  }

  const PLAN_SEATS: Record<string, number> = { pyme: 5, empresa: 20 };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7; --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0; --white: #ffffff; --red: #dc2626; }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; }
        .logo { font-family: 'DM Serif Display', serif; font-size: 26px; color: var(--green); margin-bottom: 32px; }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 20px; padding: 36px 32px; width: 100%; max-width: 480px; text-align: center; }
        .card-icon { width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .card-title { font-family: 'DM Serif Display', serif; font-size: 26px; line-height: 1.2; margin-bottom: 10px; }
        .card-sub { font-size: 15px; color: var(--gray); line-height: 1.6; margin-bottom: 24px; }
        .org-badge { display: inline-flex; align-items: center; gap: 8px; background: var(--green-light); color: var(--green); border-radius: 10px; padding: 10px 16px; font-size: 15px; font-weight: 700; margin-bottom: 24px; }
        .btn-primary { width: 100%; background: var(--green); color: #fff; border: none; padding: 14px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { display: block; width: 100%; background: none; border: 1.5px solid var(--border); color: var(--dark); padding: 13px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; margin-top: 10px; text-decoration: none; text-align: center; }
        .info-box { background: var(--green-light); border: 1px solid rgba(10,124,89,0.2); border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #0a5c44; text-align: left; margin-bottom: 20px; line-height: 1.6; }
        .error-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px 14px; font-size: 14px; color: var(--red); margin-bottom: 20px; }
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(10,124,89,0.3); border-top-color: var(--green); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div className="page">
        <div className="logo">ritto</div>
        <div className="card">
          {state === 'loading' && (
            <>
              <div className="spinner" style={{ marginBottom: 16 }} />
              <div style={{ color: 'var(--gray)', fontSize: 14 }}>Verificando invitación…</div>
            </>
          )}

          {(state === 'ready' || state === 'accepting') && (
            <>
              <div className="card-icon" style={{ background: 'var(--green-light)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <div className="card-title">Te invitaron a unirte</div>
              <div className="card-sub">Vas a ser parte de la organización:</div>
              <div className="org-badge">
                🏢 {orgName}
              </div>
              {inviteEmail && (
                <div className="info-box">
                  Esta invitación fue generada para <strong>{inviteEmail}</strong>.<br />
                  Al aceptar, tu cuenta de Ritto queda vinculada a esta organización.
                </div>
              )}
              <button className="btn-primary" disabled={state === 'accepting'} onClick={accept}>
                {state === 'accepting' ? 'Aceptando…' : 'Aceptar invitación →'}
              </button>
            </>
          )}

          {state === 'needsLogin' && (
            <>
              <div className="card-icon" style={{ background: '#eff6ff' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <div className="card-title">Invitación a {orgName}</div>
              <div className="card-sub">
                Necesitás iniciar sesión o crear una cuenta para aceptar esta invitación.
              </div>
              {inviteEmail && (
                <div className="info-box">
                  Registrate con <strong>{inviteEmail}</strong> para que la invitación quede vinculada a tu cuenta.
                </div>
              )}
              <a className="btn-primary" style={{ display: 'block', textDecoration: 'none', lineHeight: '1.4' }} href={`/login?next=/join?token=${token}`}>
                Iniciar sesión →
              </a>
              <a className="btn-secondary" href={`/register?next=/join?token=${token}`}>
                Crear cuenta nueva
              </a>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="card-icon" style={{ background: '#dcfce7' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="card-title">¡Ya sos parte del equipo!</div>
              <div className="card-sub">Te uniste a <strong>{orgName}</strong>. Redirigiendo a tu cuenta…</div>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="card-icon" style={{ background: '#fef2f2' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <div className="card-title">Invitación inválida</div>
              <div className="error-box">{errorMsg}</div>
              <a className="btn-secondary" href="/login">Ir a inicio →</a>
            </>
          )}
        </div>
      </div>
    </>
  );
}
