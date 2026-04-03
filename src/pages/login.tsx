import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError('Email o contraseña incorrectos.');
      } else {
        router.push('/app');
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Cuenta creada. Revisá tu email para confirmar.');
      }
    }

    setLoading(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
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
        }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .logo {
          font-family: 'DM Serif Display', serif;
          font-size: 28px;
          color: var(--green);
          margin-bottom: 32px;
        }
        .card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 36px;
          width: 100%;
          max-width: 400px;
        }
        .card-title {
          font-family: 'DM Serif Display', serif;
          font-size: 24px;
          margin-bottom: 6px;
        }
        .card-sub { font-size: 14px; color: var(--gray); margin-bottom: 28px; }
        .field { margin-bottom: 16px; }
        label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; }
        input[type="email"], input[type="password"] {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-family: 'Figtree', sans-serif;
          font-size: 15px;
          outline: none;
          transition: border-color 0.15s;
        }
        input:focus { border-color: var(--green); }
        .btn-submit {
          width: 100%;
          background: var(--green);
          color: #fff;
          border: none;
          padding: 12px;
          border-radius: 9px;
          font-family: 'Figtree', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 8px;
        }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: var(--red);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .success-msg {
          background: var(--green-light);
          border: 1px solid rgba(10,124,89,0.25);
          color: var(--green);
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .toggle {
          text-align: center;
          margin-top: 20px;
          font-size: 13px;
          color: var(--gray);
        }
        .toggle button {
          background: none;
          border: none;
          color: var(--green);
          font-weight: 600;
          cursor: pointer;
          font-family: 'Figtree', sans-serif;
          font-size: 13px;
        }
      `}</style>

      <div className="page">
        <div className="logo">Ritto</div>
        <div className="card">
          <h1 className="card-title">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h1>
          <p className="card-sub">
            {mode === 'login'
              ? 'Ingresá a tu cuenta de Ritto'
              : 'Empezá a procesar tus facturas gratis'}
          </p>

          {error && <div className="error">{error}</div>}
          {success && <div className="success-msg">{success}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@empresa.com"
              />
            </div>
            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <button className="btn-submit" type="submit" disabled={loading}>
              {loading
                ? 'Cargando…'
                : mode === 'login'
                ? 'Ingresar'
                : 'Crear cuenta'}
            </button>
          </form>

          <div className="toggle">
            {mode === 'login' ? (
              <>
                ¿No tenés cuenta?{' '}
                <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>
                  Registrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tenés cuenta?{' '}
                <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
                  Iniciá sesión
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
