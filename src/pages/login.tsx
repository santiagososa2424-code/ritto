import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [rut, setRut] = useState('');
  const [telefono, setTelefono] = useState('');
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
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          nombre,
          empresa,
          rut: rut || null,
          telefono: telefono || null,
        });
        if (data.session) {
          router.push('/app');
        } else {
          setSuccess('¡Cuenta creada! Revisá tu email para confirmar y después iniciá sesión.');
        }
      }
    }
    setLoading(false);
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError('');
    setSuccess('');
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
          padding: 24px 16px;
        }
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
          outline: none; transition: border-color 0.15s; background: var(--white);
        }
        input:focus { border-color: var(--green); }
        .divider { display: flex; align-items: center; gap: 10px; margin: 16px 0; color: var(--gray); font-size: 12px; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
        .btn-submit {
          width: 100%; background: var(--green); color: #fff; border: none;
          padding: 13px; border-radius: 9px; font-family: 'Figtree', sans-serif;
          font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 4px;
        }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        .error { background: #fef2f2; border: 1px solid #fecaca; color: var(--red); border-radius: 8px; padding: 10px 13px; font-size: 13px; margin-bottom: 14px; }
        .success-msg { background: var(--green-light); border: 1px solid rgba(10,124,89,0.25); color: var(--green); border-radius: 8px; padding: 10px 13px; font-size: 13px; margin-bottom: 14px; }
        .toggle { text-align: center; margin-top: 18px; font-size: 13px; color: var(--gray); }
        .toggle button { background: none; border: none; color: var(--green); font-weight: 600; cursor: pointer; font-family: 'Figtree', sans-serif; font-size: 13px; }
        .section-label { font-size: 11px; font-weight: 600; color: var(--gray); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; margin-top: 4px; }
        @media (max-width: 480px) {
          .card { padding: 24px 18px; }
          .field-row { grid-template-columns: 1fr; gap: 0; }
        }
      `}</style>

      <div className="page">
        <div className="logo" onClick={() => router.push('/')}>Ritto</div>
        <div className="card">
          <h1 className="card-title">{mode === 'login' ? 'Iniciá sesión' : 'Crear cuenta'}</h1>
          <p className="card-sub">{mode === 'login' ? 'Bienvenido de vuelta' : '14 días gratis, sin tarjeta de crédito'}</p>

          {error && <div className="error">{error}</div>}
          {success && <div className="success-msg">{success}</div>}

          <form onSubmit={handleSubmit}>
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
              {loading ? 'Cargando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta gratis'}
            </button>
          </form>

          <div className="toggle">
            {mode === 'login'
              ? <>¿No tenés cuenta? <button onClick={() => switchMode('signup')}>Registrate gratis</button></>
              : <>¿Ya tenés cuenta? <button onClick={() => switchMode('login')}>Iniciá sesión</button></>}
          </div>
        </div>
      </div>
    </>
  );
}
