import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ExcelColumn } from '../lib/types';
import { RITTO_FIELDS, DEFAULT_COLUMNS } from '../lib/types';

type Platform = 'excel' | 'sheets';
type Step = 1 | 2 | 3 | 4 | 5;

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [step, setStep] = useState<Step>(1);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [savingUrl, setSavingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [hasColumns, setHasColumns] = useState<'yes' | 'no' | null>(null);
  const [excelColumns, setExcelColumns] = useState<ExcelColumn[]>(DEFAULT_COLUMNS.map((c) => ({ ...c })));
  const [saving, setSaving] = useState(false);
  const [hasTrial, setHasTrial] = useState(false);
  const [savedNombre, setSavedNombre] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      setUser(data.user);
      supabase.from('profiles')
        .select('nombre, empresa, onboarding_complete, trial_ends_at, google_access_token, google_sheet_id')
        .eq('id', data.user.id)
        .single()
        .then(({ data: p }) => {
          if (!p) return;
          if (p.onboarding_complete === true) { router.replace('/app'); return; }
          if (p.nombre) { setNombre(p.nombre); setSavedNombre(p.nombre); }
          if (p.empresa) setEmpresa(p.empresa);
          if (p.trial_ends_at) setHasTrial(true);
          if (p.google_access_token) setGoogleConnected(true);
          if (p.google_sheet_id) setSheetUrl(p.google_sheet_id as string);

          // Returning from Google OAuth during onboarding
          if (router.query.google === 'connected') {
            setGoogleConnected(true);
            setPlatform('sheets');
            setStep(3);
          }
        });
    });
  }, [router]);

  const totalSteps = platform === 'sheets' ? 5 : 4;
  const stepLabel: Record<Step, string> = {
    1: `Paso 1 de ${totalSteps}`,
    2: `Paso 2 de ${totalSteps}`,
    3: `Paso 3 de ${totalSteps}`,
    4: `Paso 4 de ${totalSteps}`,
    5: `Paso 5 de ${totalSteps}`,
  };

  const firstName = (savedNombre || nombre).split(' ')[0] || 'ahí';

  async function saveStep1() {
    if (!user || !nombre.trim() || !empresa.trim()) return;
    setSaving(true);
    await supabase.from('profiles').update({ nombre: nombre.trim(), empresa: empresa.trim() }).eq('id', user.id);
    setSavedNombre(nombre.trim());
    setSaving(false);
    setStep(2);
  }

  async function saveSheetUrl() {
    if (!user || !sheetUrl.trim()) return;
    setSavingUrl(true);
    setUrlError('');
    const res = await fetch('/api/sheets/save-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, sheetUrl: sheetUrl.trim() }),
    });
    if (res.ok) {
      setSavingUrl(false);
      setStep(4);
    } else {
      const d = await res.json();
      setUrlError(d.error ?? 'Error al guardar');
      setSavingUrl(false);
    }
  }

  async function finish(mapping: ExcelColumn[]) {
    if (!user) return;
    setSaving(true);
    const updates: Record<string, unknown> = {
      id: user.id,
      excel_mapping: mapping,
      onboarding_complete: true,
    };
    if (!hasTrial) {
      updates.subscription_status = 'trial';
      updates.trial_ends_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    }
    await supabase.from('profiles').upsert(updates);
    router.push('/app');
  }

  function addColumn() {
    setExcelColumns((prev) => [...prev, { id: crypto.randomUUID(), label: '', field: 'proveedor' }]);
  }
  function removeColumn(id: string) {
    setExcelColumns((prev) => prev.filter((c) => c.id !== id));
  }
  function updateColumn(id: string, key: 'label' | 'field', value: string) {
    setExcelColumns((prev) => prev.map((c) => c.id === id ? { ...c, [key]: value } : c));
  }

  if (!user) return null;

  const colsStep = platform === 'sheets' ? 4 : 3;
  const doneStep = platform === 'sheets' ? 5 : 4;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7; --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0; --white: #ffffff; --red: #dc2626; }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 16px; }
        .logo { font-family: 'DM Serif Display', serif; font-size: 26px; color: var(--green); margin-bottom: 32px; }
        .progress { display: flex; gap: 6px; margin-bottom: 32px; }
        .prog-dot { width: 28px; height: 4px; border-radius: 99px; background: var(--border); transition: background 0.2s; }
        .prog-dot.done { background: var(--green); }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 20px; padding: 36px 32px; width: 100%; max-width: 520px; }
        .card-wide { max-width: 680px; }
        .step-tag { font-size: 11px; font-weight: 700; color: var(--green); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
        .card-title { font-family: 'DM Serif Display', serif; font-size: 26px; line-height: 1.2; margin-bottom: 8px; }
        .card-sub { font-size: 15px; color: var(--gray); line-height: 1.6; margin-bottom: 24px; }
        .input-group { margin-bottom: 16px; }
        .input-label { display: block; font-size: 13px; font-weight: 600; color: var(--dark); margin-bottom: 6px; }
        .input-field { width: 100%; padding: 11px 13px; border: 1.5px solid var(--border); border-radius: 9px; font-family: 'Figtree', sans-serif; font-size: 15px; outline: none; background: var(--white); transition: border-color 0.15s; }
        .input-field:focus { border-color: var(--green); }
        .option-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }
        .option-card { border: 2px solid var(--border); border-radius: 14px; padding: 22px 18px; cursor: pointer; transition: border-color 0.15s, background 0.15s; text-align: center; }
        .option-card:hover { border-color: var(--green); }
        .option-card.selected { border-color: var(--green); background: var(--green-light); }
        .option-icon { font-size: 32px; margin-bottom: 10px; }
        .option-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; color: var(--dark); }
        .option-desc { font-size: 13px; color: var(--gray); line-height: 1.4; }
        .btn-primary { width: 100%; background: var(--green); color: #fff; border: none; padding: 14px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { background: none; border: 1.5px solid var(--border); color: var(--dark); padding: 13px 20px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; }
        .btn-row { display: flex; gap: 10px; margin-top: 8px; }
        .btn-row .btn-primary { margin-top: 0; }
        .tip-box { background: var(--green-light); border: 1px solid rgba(10,124,89,0.2); border-radius: 12px; padding: 14px 16px; font-size: 14px; color: #0a5c44; line-height: 1.6; margin-bottom: 20px; }
        .warn-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 16px; font-size: 14px; color: #78350f; line-height: 1.6; margin-bottom: 20px; }
        .error-msg { color: var(--red); font-size: 13px; margin-top: 6px; }
        .google-btn { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; padding: 13px; border: 1.5px solid var(--border); border-radius: 10px; background: var(--white); font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; margin-bottom: 12px; transition: border-color 0.15s; }
        .google-btn:hover { border-color: #4285f4; }
        .connected-badge { display: inline-flex; align-items: center; gap: 6px; background: var(--green-light); color: var(--green); border-radius: 8px; padding: 8px 14px; font-size: 14px; font-weight: 600; margin-bottom: 16px; }
        .col-header { display: grid; grid-template-columns: 22px 1fr 1fr 28px; gap: 8px; margin-bottom: 6px; }
        .col-row { display: grid; grid-template-columns: 22px 1fr 1fr 28px; gap: 8px; align-items: center; margin-bottom: 8px; }
        .col-num { font-size: 12px; color: var(--gray); text-align: right; font-weight: 500; }
        .col-label-input { padding: 8px 10px; border: 1px solid var(--border); border-radius: 7px; font-family: 'Figtree', sans-serif; font-size: 13px; outline: none; width: 100%; }
        .col-label-input:focus { border-color: var(--green); }
        .col-field-select { padding: 8px 10px; border: 1px solid var(--border); border-radius: 7px; font-family: 'Figtree', sans-serif; font-size: 13px; background: var(--white); outline: none; cursor: pointer; width: 100%; }
        .col-remove { background: none; border: none; color: var(--gray); font-size: 18px; cursor: pointer; padding: 2px; border-radius: 4px; line-height: 1; }
        .col-remove:hover { color: var(--red); }
        .col-actions { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; margin-bottom: 24px; }
        .btn-add-col { background: none; border: 1.5px dashed var(--border); color: var(--gray); padding: 7px 14px; border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 13px; cursor: pointer; }
        .btn-add-col:hover { border-color: var(--green); color: var(--green); }
        .btn-reset-col { background: none; border: 1px solid var(--border); color: var(--gray); padding: 7px 14px; border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 13px; cursor: pointer; }
        .final-icon { width: 64px; height: 64px; background: var(--green-light); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .final-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
        .final-item { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; color: var(--gray); line-height: 1.5; }
        .final-check { width: 20px; height: 20px; background: var(--green-light); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        @media (max-width: 560px) { .card { padding: 24px 18px; } .option-grid { grid-template-columns: 1fr; } .card-title { font-size: 22px; } }
      `}</style>
      <div className="page">
        <div className="logo">ritto</div>
        <div className="progress">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
            <div key={n} className={`prog-dot${step >= n ? ' done' : ''}`} />
          ))}
        </div>

        {/* STEP 1: Nombre + empresa */}
        {step === 1 && (
          <div className="card">
            <div className="step-tag">{stepLabel[1]}</div>
            <div className="card-title">¡Bienvenido a Ritto!</div>
            <div className="card-sub">Vamos a configurar todo en 2 minutos. Primero, contanos un poco sobre vos.</div>
            <div className="input-group">
              <label className="input-label">Tu nombre completo</label>
              <input className="input-field" type="text" placeholder="Juan Pérez" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Nombre de tu empresa o sucursal</label>
              <input className="input-field" type="text" placeholder="Ej: Distribuidora Norte" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
            </div>
            <button className="btn-primary" disabled={!nombre.trim() || !empresa.trim() || saving} onClick={saveStep1}>
              {saving ? 'Guardando…' : 'Siguiente →'}
            </button>
          </div>
        )}

        {/* STEP 2: Excel o Google Sheets */}
        {step === 2 && (
          <div className="card">
            <div className="step-tag">{stepLabel[2]}</div>
            <div className="card-title">¿Cómo llevás tus facturas?</div>
            <div className="card-sub">Elegí cómo querés exportar los datos que Ritto procesa.</div>
            <div className="option-grid">
              <div className={`option-card${platform === 'excel' ? ' selected' : ''}`} onClick={() => setPlatform('excel')}>
                <div className="option-icon">📊</div>
                <div className="option-title">Excel / CSV</div>
                <div className="option-desc">Descargás un archivo y lo abrís en tu planilla</div>
              </div>
              <div className={`option-card${platform === 'sheets' ? ' selected' : ''}`} onClick={() => setPlatform('sheets')}>
                <div className="option-icon">📋</div>
                <div className="option-title">Google Sheets</div>
                <div className="option-desc">Enviás las facturas directo a tu planilla con un clic</div>
              </div>
            </div>
            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setStep(1)}>← Atrás</button>
              <button className="btn-primary" disabled={!platform} onClick={() => setStep(3)}>Siguiente →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Si Sheets → conectar Google; Si Excel → columnas */}
        {step === 3 && platform === 'sheets' && (
          <div className="card">
            <div className="step-tag">{stepLabel[3]}</div>
            <div className="card-title">Conectá tu Google Sheets</div>
            <div className="card-sub">Ritto va a necesitar acceso a tu cuenta de Google para escribir en tu planilla.</div>
            {!googleConnected ? (
              <>
                <div className="tip-box">
                  <strong>¿Para qué sirve?</strong> Al conectar Google, el botón "Exportar a Google Sheets" envía todas las facturas del mes directo a tu planilla — sin descargar nada.
                </div>
                <button
                  className="google-btn"
                  onClick={() => { window.location.href = `/api/auth/google?userId=${user?.id}&returnTo=onboarding`; }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Conectar con Google
                </button>
                <div className="btn-row">
                  <button className="btn-secondary" onClick={() => setStep(2)}>← Atrás</button>
                </div>
              </>
            ) : (
              <>
                <div className="connected-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Google conectado
                </div>
                <div className="input-group">
                  <label className="input-label">URL de tu planilla de Google Sheets</label>
                  <input
                    className="input-field"
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                  />
                  {urlError && <div className="error-msg">{urlError}</div>}
                </div>
                <div className="tip-box">
                  <strong>¿Cómo obtengo el link?</strong> Abrí tu planilla en Google Sheets → copiá la URL del navegador → pegala acá.
                </div>
                <div className="btn-row">
                  <button className="btn-secondary" onClick={() => setStep(2)}>← Atrás</button>
                  <button className="btn-primary" disabled={!sheetUrl.trim() || savingUrl} onClick={saveSheetUrl}>
                    {savingUrl ? 'Guardando…' : 'Guardar y continuar →'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 3 && platform === 'excel' && (
          <div className="card">
            <div className="step-tag">{stepLabel[3]}</div>
            <div className="card-title">¿Tenés columnas propias?</div>
            <div className="card-sub">Si ya tenés una planilla armada, Ritto puede exportar con los mismos nombres de columnas.</div>
            <div className="option-grid">
              <div className={`option-card${hasColumns === 'yes' ? ' selected' : ''}`} onClick={() => setHasColumns('yes')}>
                <div className="option-icon">✅</div>
                <div className="option-title">Sí, tengo mis columnas</div>
                <div className="option-desc">Las configuro ahora para que coincidan con mi planilla</div>
              </div>
              <div className={`option-card${hasColumns === 'no' ? ' selected' : ''}`} onClick={() => setHasColumns('no')}>
                <div className="option-icon">🆕</div>
                <div className="option-title">Uso la plantilla de Ritto</div>
                <div className="option-desc">Empiezo con la plantilla básica, la puedo cambiar después</div>
              </div>
            </div>
            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setStep(2)}>← Atrás</button>
              <button className="btn-primary" disabled={!hasColumns} onClick={() => hasColumns === 'yes' ? setStep(colsStep as Step) : finish(DEFAULT_COLUMNS)}>
                {saving ? 'Guardando…' : hasColumns === 'yes' ? 'Configurar columnas →' : 'Empezar →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Columnas (sheets) o Done (excel no custom) */}
        {step === 4 && platform === 'sheets' && (
          <div className="card">
            <div className="step-tag">{stepLabel[4]}</div>
            <div className="card-title">¿Tenés columnas propias?</div>
            <div className="card-sub">Si tu planilla ya tiene columnas con nombres específicos, Ritto los puede respetar.</div>
            <div className="option-grid">
              <div className={`option-card${hasColumns === 'yes' ? ' selected' : ''}`} onClick={() => setHasColumns('yes')}>
                <div className="option-icon">✅</div>
                <div className="option-title">Sí, tengo mis columnas</div>
                <div className="option-desc">Las configuro ahora</div>
              </div>
              <div className={`option-card${hasColumns === 'no' ? ' selected' : ''}`} onClick={() => setHasColumns('no')}>
                <div className="option-icon">🆕</div>
                <div className="option-title">Uso la plantilla de Ritto</div>
                <div className="option-desc">Empiezo con la plantilla básica</div>
              </div>
            </div>
            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setStep(3)}>← Atrás</button>
              <button className="btn-primary" disabled={!hasColumns} onClick={() => hasColumns === 'yes' ? setStep(5) : finish(DEFAULT_COLUMNS)}>
                {saving ? 'Guardando…' : hasColumns === 'yes' ? 'Configurar columnas →' : 'Empezar →'}
              </button>
            </div>
          </div>
        )}

        {/* Columns config (step 4 for excel, step 5 for sheets — reused) */}
        {((step === colsStep && platform === 'excel' && hasColumns === 'yes') ||
          (step === 5 && platform === 'sheets' && hasColumns === 'yes')) && (
          <div className="card card-wide">
            <div className="step-tag">{stepLabel[step]}</div>
            <div className="card-title">¿Cómo se llaman tus columnas?</div>
            <div className="card-sub">Escribí exactamente como aparecen en tu planilla.</div>
            <div className="tip-box"><strong>Ejemplo:</strong> si tu planilla tiene "Empresa proveedora", escribís eso exactamente.</div>
            <div className="col-header">
              <span />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Nombre en tu planilla</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Dato de Ritto</span>
              <span />
            </div>
            {excelColumns.map((col, i) => (
              <div key={col.id} className="col-row">
                <span className="col-num">{i + 1}</span>
                <input className="col-label-input" type="text" value={col.label} placeholder="Nombre de columna" onChange={(e) => updateColumn(col.id, 'label', e.target.value)} />
                <select className="col-field-select" value={col.field} onChange={(e) => updateColumn(col.id, 'field', e.target.value)}>
                  {RITTO_FIELDS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
                </select>
                <button className="col-remove" type="button" onClick={() => removeColumn(col.id)}>×</button>
              </div>
            ))}
            <div className="col-actions">
              <button type="button" className="btn-add-col" onClick={addColumn}>+ Agregar columna</button>
              <button type="button" className="btn-reset-col" onClick={() => setExcelColumns(DEFAULT_COLUMNS.map((c) => ({ ...c })))}>Restaurar por defecto</button>
            </div>
            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setStep((step - 1) as Step)}>← Atrás</button>
              <button className="btn-primary" disabled={saving} onClick={() => finish(excelColumns)}>
                {saving ? 'Guardando…' : 'Guardar y empezar →'}
              </button>
            </div>
          </div>
        )}

        {/* FINAL: Listo */}
        {((step === doneStep && hasColumns !== 'yes') || false) && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="step-tag" style={{ textAlign: 'center' }}>{stepLabel[step]}</div>
            <div className="final-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="card-title" style={{ textAlign: 'center' }}>¡Todo listo, {firstName}!</div>
            <div className="card-sub" style={{ textAlign: 'center', marginBottom: 24 }}>Ritto está configurado para <strong>{empresa}</strong>. Empezá subiendo tu primera factura.</div>
            <div className="final-list" style={{ textAlign: 'left' }}>
              <div className="final-item"><div className="final-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span>Subís XMLs, PDFs o fotos de facturas</span></div>
              <div className="final-item"><div className="final-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span>Ritto extrae todos los datos automáticamente</span></div>
              {platform === 'sheets' && <div className="final-item"><div className="final-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span>Exportás con un clic a tu Google Sheets</span></div>}
              {platform === 'excel' && <div className="final-item"><div className="final-check"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><span>Descargás el Excel con tu plantilla configurada</span></div>}
            </div>
            <button className="btn-primary" disabled={saving} onClick={() => finish(DEFAULT_COLUMNS)}>
              {saving ? 'Guardando…' : 'Empezar a usar Ritto →'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
