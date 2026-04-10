import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';

type Sistema = 'gns' | 'zeta' | 'siigo';

const SISTEMAS: { id: Sistema; name: string; desc: string }[] = [
  { id: 'gns', name: 'GNS Contable', desc: 'Gestión de Importaciones' },
  { id: 'zeta', name: 'ZetaSoftware', desc: 'Importación XLS' },
  { id: 'siigo', name: 'Siigo', desc: 'Comprobantes contables' },
];

interface Profile {
  nombre: string;
  empresa: string;
  rut: string;
  telefono: string;
  sistema_contable: Sistema;
  plan?: string;
  trial_ends_at?: string | null;
  subscription_status?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>({ nombre: '', empresa: '', rut: '', telefono: '', sistema_contable: 'gns' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      setUser(data.user);
      supabase.from('profiles').select('*').eq('id', data.user.id).single().then(({ data: p }) => {
        if (p) {
          setProfile({
            nombre: p.nombre ?? '',
            empresa: p.empresa ?? '',
            rut: p.rut ?? '',
            telefono: p.telefono ?? '',
            sistema_contable: (p.sistema_contable as Sistema) ?? 'gns',
          });
          if (p.trial_ends_at && p.subscription_status === 'trial') {
            const days = Math.max(0, Math.ceil((new Date(p.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            setTrialDaysLeft(days);
          }
          if (p.plan) setPlanName(p.plan.charAt(0).toUpperCase() + p.plan.slice(1));
        }
        setLoading(false);
      });
    });
  }, [router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('profiles').upsert({ id: user.id, ...profile });
    if (err) setError('Error al guardar. Intentá de nuevo.');
    else { setSuccess(true); setTimeout(() => setSuccess(false), 3000); }
    setSaving(false);
  }

  if (loading) return null;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7;
          --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0;
          --white: #ffffff; --red: #dc2626; --red-light: #fef2f2;
        }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page-wrap { padding: 28px 28px 80px; max-width: 600px; }
        .page-title { font-family: 'DM Serif Display', serif; font-size: 28px; margin-bottom: 24px; }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 24px; margin-bottom: 16px; }
        .card-title { font-size: 14px; font-weight: 600; margin-bottom: 16px; color: var(--dark); }
        .field { margin-bottom: 14px; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 5px; color: var(--gray); }
        input[type="text"], input[type="tel"], input[type="email"] {
          width: 100%; padding: 10px 13px; border: 1px solid var(--border);
          border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 15px;
          outline: none; transition: border-color 0.15s;
        }
        input:focus { border-color: var(--green); }
        input:disabled { background: var(--bg); color: var(--gray); }
        .btn-save { background: var(--green); color: #fff; border: none; padding: 11px 28px; border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-danger { background: none; border: 1px solid #fecaca; color: var(--red); padding: 11px 28px; border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; width: 100%; }
        .success-bar { background: var(--green-light); color: var(--green); border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 500; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .error-bar { background: var(--red-light); color: var(--red); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
        .form-footer { display: flex; justify-content: flex-end; margin-top: 4px; }
        .sistema-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .sistema-opt {
          border: 2px solid var(--border); border-radius: 10px; padding: 14px 10px;
          text-align: center; cursor: pointer; transition: border-color 0.15s, background 0.15s;
          background: var(--bg);
        }
        .sistema-opt.active { border-color: var(--green); background: var(--green-light); }
        .sistema-opt .so-name { font-weight: 700; font-size: 13px; margin-bottom: 2px; }
        .sistema-opt .so-desc { font-size: 11px; color: var(--gray); }
        .sistema-opt.active .so-desc { color: var(--green); }
        @media (max-width: 768px) {
          .page-wrap { padding: 18px 16px 80px; }
          .field-row { grid-template-columns: 1fr; gap: 0; }
          .page-title { font-size: 22px; }
          .sistema-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <Sidebar active="settings" userEmail={user?.email} trialDaysLeft={trialDaysLeft} planName={planName} />

      <div className="with-sidebar">
        <div className="page-wrap">
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

            <div className="card">
              <div className="card-title">Sistema contable</div>
              <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 14 }}>
                El Excel se exportará con las columnas exactas de tu sistema.
              </p>
              <div className="sistema-grid">
                {SISTEMAS.map((s) => (
                  <div
                    key={s.id}
                    className={`sistema-opt${profile.sistema_contable === s.id ? ' active' : ''}`}
                    onClick={() => setProfile({ ...profile, sistema_contable: s.id })}
                  >
                    <div className="so-name">{s.name}</div>
                    <div className="so-desc">{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-footer">
              <button className="btn-save" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title">Cuenta</div>
            <button className="btn-danger" onClick={async () => { await supabase.auth.signOut(); router.replace('/login'); }}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
