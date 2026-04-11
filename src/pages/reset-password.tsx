import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase sets the session from the URL hash automatically
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) setError('No se pudo actualizar la contraseña. Pedí un nuevo link.');
    else setDone(true);
    setLoading(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7; --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0; --white: #ffffff; --red: #dc2626; }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
        .logo { font-family: 'DM Serif Display', serif; font-size: 28px; color: var(--green); margin-bottom: 28px; cursor: pointer; }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 32px 28px; width: 100%; max-width: 400px; }
        .card-title { font-family: 'DM Serif Display', serif; font-size: 22px; margin-bottom: 4px; }
        .card-sub { font-size: 13px; color: var(--gray); margin-bottom: 24px; }
        label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 5px; color: var(--gray); }
        input { width: 100%; padding: 10px 13px; border: 1px solid var(--border); border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 15px; outline: none; }
        input:focus { border-color: var(--green); }
        .field { margin-bottom: 16px; }
        .btn { width: 100%; background: var(--green); color: #fff; border: none; padding: 12px; border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 4px; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .error { background: #fef2f2; color: var(--red); border-radius: 8px; padding: 10px 13px; font-size: 13px; margin-bottom: 14px; }
        .success-icon { width: 52px; height: 52px; background: var(--green-light); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
        .success-title { font-family: 'DM Serif Display', serif; font-size: 20px; margin-bottom: 8px; text-align: center; }
        .success-desc { font-size: 13px; color: var(--gray); text-align: center; line-height: 1.6; margin-bottom: 20px; }
      `}</style>
      <div className="page">
        <div className="logo" onClick={() => router.push('/')}>ritto</div>
        <div className="card">
          {done ? (
            <>
              <div className="success-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div className="success-title">Contraseña actualizada</div>
              <div className="success-desc">Ya podés iniciar sesión con tu nueva contraseña.</div>
              <button className="btn" onClick={() => router.push('/login')}>Ir al login</button>
            </>
          ) : !ready ? (
            <>
              <div className="card-title">Verificando link…</div>
              <div className="card-sub">Esperá un momento mientras validamos tu sesión.</div>
            </>
          ) : (
            <>
              <div className="card-title">Nueva contraseña</div>
              <div className="card-sub">Elegí una contraseña segura (mín. 6 caracteres)</div>
              {error && <div className="error">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>Nueva contraseña</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <div className="field">
                  <label>Confirmar contraseña</label>
                  <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required />
                </div>
                <button className="btn" type="submit" disabled={loading}>
                  {loading ? 'Guardando…' : 'Actualizar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
