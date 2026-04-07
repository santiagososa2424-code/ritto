import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
  nombre: string;
  empresa: string;
  rut: string;
  telefono: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>({ nombre: '', empresa: '', rut: '', telefono: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      setUser(data.user);
      supabase.from('profiles').select('*').eq('id', data.user.id).single().then(({ data: p }) => {
        if (p) setProfile({ nombre: p.nombre ?? '', empresa: p.empresa ?? '', rut: p.rut ?? '', telefono: p.telefono ?? '' });
        setLoading(false);
      });
    });
  }, [router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    const { error } = await supabase.from('profiles').upsert({ id: user.id, ...profile });
    if (error) setError('Error al guardar. Intentá de nuevo.');
    else { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
    setSaving(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (loading) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7; --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0; --white: #ffffff; --red: #dc2626; --red-light: #fef2f2; }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .nav { background: rgba(245,245,247,0.92); backdrop-filter: blur(14px); border-bottom: 1px solid var(--border); padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; height: 56px; position: sticky; top: 0; z-index: 100; }
        .logo { font-family: 'DM Serif Display', serif; font-size: 20px; color: var(--green); cursor: pointer; }
        .back-btn { background: none; border: none; color: var(--gray); font-family: 'Figtree', sans-serif; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 6px 0; }
        .main { max-width: 560px; margin: 0 auto; padding: 32px 1.5rem 60px; }
        .page-title { font-family: 'DM Serif Display', serif; font-size: 26px; margin-bottom: 24px; }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 24px; margin-bottom: 16px; }
        .card-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; }
        .field { margin-bottom: 14px; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 5px; color: var(--gray); }
        input[type="text"], input[type="tel"], input[type="email"] { width: 100%; padding: 10px 13px; border: 1px solid var(--border); border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 15px; outline: none; transition: border-color 0.15s; }
        input:focus { border-color: var(--green); }
        input:disabled { background: var(--bg); color: var(--gray); }
        .btn-save { background: var(--green); color: #fff; border: none; padding: 11px 28px; border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-danger { background: none; border: 1px solid #fecaca; color: var(--red); padding: 11px 28px; border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; width: 100%; }
        .success-bar { background: var(--green-light); color: var(--green); border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 500; margin-bottom: 16px; }
        .error-bar { background: var(--red-light); color: var(--red); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
        .form-footer { display: flex; justify-content: flex-end; margin-top: 4px; }
        @media (max-width: 480px) { .field-row { grid-template-columns: 1fr; gap: 0; } .main { padding: 24px 1rem 60px; } }
      `}</style>

      <nav className="nav">
        <div className="logo" onClick={() => router.push('/app')}>Ritto</div>
        <button className="back-btn" onClick={() => router.push('/app')}>← Volver</button>
      </nav>

      <main className="main">
        <h1 className="page-title">Configuración</h1>
        {success && <div className="success-bar">✓ Cambios guardados</div>}
        {error && <div className="error-bar">{error}</div>}

        <form onSubmit={save}>
          <div className="card">
            <div className="card-title">Datos personales</div>
            <div className="field">
              <label>Nombre completo</label>
              <input type="text" value={profile.nombre} onChange={(e) => setProfile({ ...profile, nombre: e.target.value })} placeholder="Juan García" />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={user?.email ?? ''} disabled />
            </div>
          </div>
          <div className="card">
            <div className="card-title">Empresa</div>
            <div className="field">
              <label>Nombre de la empresa</label>
              <input type="text" value={profile.empresa} onChange={(e) => setProfile({ ...profile, empresa: e.target.value })} placeholder="Mi Empresa SA" />
            </div>
            <div className="field-row">
              <div>
                <label>RUT</label>
                <input type="text" value={profile.rut} onChange={(e) => setProfile({ ...profile, rut: e.target.value })} placeholder="21.234.567-8" />
              </div>
              <div>
                <label>Teléfono</label>
                <input type="tel" value={profile.telefono} onChange={(e) => setProfile({ ...profile, telefono: e.target.value })} placeholder="+598 99 123 456" />
              </div>
            </div>
          </div>
          <div className="form-footer">
            <button className="btn-save" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button>
          </div>
        </form>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">Cuenta</div>
          <button className="btn-danger" onClick={handleSignOut}>Cerrar sesión</button>
        </div>
      </main>
    </>
  );
}
