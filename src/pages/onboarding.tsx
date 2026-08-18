import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { ExcelColumn } from '../lib/types';
import { RITTO_FIELDS, DEFAULT_COLUMNS } from '../lib/types';

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [nombre, setNombre] = useState('');
  const [step, setStep] = useState<Step>(1);
  const [platform, setPlatform] = useState<'excel' | 'sheets' | null>(null);
  const [hasColumns, setHasColumns] = useState<'yes' | 'no' | null>(null);
  const [excelColumns, setExcelColumns] = useState<ExcelColumn[]>(DEFAULT_COLUMNS.map((c) => ({ ...c })));
  const [saving, setSaving] = useState(false);
  const [sheetsNote, setSheetsNote] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      setUser(data.user);
      supabase.from('profiles').select('nombre, onboarding_complete').eq('id', data.user.id).single().then(({ data: p }) => {
        if (!p) return;
        if (p.onboarding_complete === true) { router.replace('/app'); return; }
        if (p.nombre) setNombre(p.nombre);
      });
    });
  }, [router]);

  function addColumn() {
    setExcelColumns((prev) => [...prev, { id: crypto.randomUUID(), label: '', field: 'proveedor' }]);
  }

  function removeColumn(id: string) {
    setExcelColumns((prev) => prev.filter((c) => c.id !== id));
  }

  function updateColumn(id: string, key: 'label' | 'field', value: string) {
    setExcelColumns((prev) => prev.map((c) => c.id === id ? { ...c, [key]: value } : c));
  }

  async function finish(mapping: ExcelColumn[]) {
    if (!user) return;
    setSaving(true);
    await supabase.from('profiles').update({
      excel_mapping: mapping,
      onboarding_complete: true,
    }).eq('id', user.id);
    router.push('/app');
  }

  if (!user) return null;

  const firstName = nombre.split(' ')[0] || 'ahí';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7;
          --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0;
          --white: #ffffff; --red: #dc2626;
        }
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
        .card-sub { font-size: 15px; color: var(--gray); line-height: 1.6; margin-bottom: 28px; }
        .option-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px; }
        .option-card {
          border: 2px solid var(--border); border-radius: 14px; padding: 22px 18px;
          cursor: pointer; transition: border-color 0.15s, background 0.15s; text-align: center;
        }
        .option-card:hover { border-color: var(--green); }
        .option-card.selected { border-color: var(--green); background: var(--green-light); }
        .option-icon { font-size: 32px; margin-bottom: 10px; }
        .option-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; color: var(--dark); }
        .option-desc { font-size: 13px; color: var(--gray); line-height: 1.4; }
        .option-card.selected .option-desc { color: var(--green); }
        .option-soon { display: inline-block; background: #f3e8ff; color: #6b21a8; border-radius: 20px; padding: 2px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.3px; }
        .btn-primary { width: 100%; background: var(--green); color: #fff; border: none; padding: 14px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-secondary { background: none; border: 1.5px solid var(--border); color: var(--dark); padding: 13px 20px; border-radius: 10px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; }
        .btn-row { display: flex; gap: 10px; margin-top: 8px; }
        .btn-row .btn-primary { margin-top: 0; }
        .note-box { background: #f3e8ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 14px 16px; font-size: 14px; color: #6b21a8; line-height: 1.6; margin-bottom: 20px; }
        .tip-box { background: var(--green-light); border: 1px solid rgba(10,124,89,0.2); border-radius: 12px; padding: 14px 16px; font-size: 14px; color: #0a5c44; line-height: 1.6; margin-bottom: 20px; }

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

        @media (max-width: 560px) {
          .card { padding: 24px 18px; }
          .option-grid { grid-template-columns: 1fr; }
          .card-title { font-size: 22px; }
        }
      `}</style>

      <div className="page">
        <div className="logo">ritto</div>

        <div className="progress">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`prog-dot${step >= n ? ' done' : ''}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="card">
            <div className="step-tag">Paso 1 de 4</div>
            <div className="card-title">¡Hola, {firstName}! Vamos a configurar Ritto.</div>
            <div className="card-sub">Son 2 minutos y después ya podés subir facturas. ¿Cómo vas a llevar tus datos?</div>

            <div className="option-grid">
              <div
                className={`option-card${platform === 'excel' ? ' selected' : ''}`}
                onClick={() => { setPlatform('excel'); setSheetsNote(false); }}
              >
                <div className="option-icon">📊</div>
                <div className="option-title">Excel</div>
                <div className="option-desc">Descargás un archivo .xls y lo pegás en tu planilla</div>
              </div>
              <div
                className={`option-card${platform === 'sheets' ? ' selected' : ''}`}
                onClick={() => { setPlatform('sheets'); setSheetsNote(true); }}
              >
                <div className="option-icon">📋</div>
                <div className="option-title">Google Sheets</div>
                <div className="option-desc">Descargás un CSV y lo abrís en tu hoja de cálculo</div>
                <div className="option-soon">Sincronización automática próximamente</div>
              </div>
            </div>

            {sheetsNote && (
              <div className="note-box">
                La conexión directa con Google Sheets ya viene. Mientras tanto, descargás el CSV desde Ritto y lo abrís en tu Sheets en segundos — funciona igual.
              </div>
            )}

            <button className="btn-primary" disabled={!platform} onClick={() => setStep(2)}>
              Siguiente →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <div className="step-tag">Paso 2 de 4</div>
            <div className="card-title">¿Tenés una planilla con columnas propias?</div>
            <div className="card-sub">Si ya tenés tu Excel o Sheets armado con nombres de columnas, Ritto puede usar exactamente esos nombres. Si no, usamos una plantilla básica y listo.</div>

            <div className="option-grid">
              <div
                className={`option-card${hasColumns === 'yes' ? ' selected' : ''}`}
                onClick={() => setHasColumns('yes')}
              >
                <div className="option-icon">✅</div>
                <div className="option-title">Sí, tengo mis columnas</div>
                <div className="option-desc">Quiero configurar los nombres para que coincidan con mi planilla</div>
              </div>
              <div
                className={`option-card${hasColumns === 'no' ? ' selected' : ''}`}
                onClick={() => setHasColumns('no')}
              >
                <div className="option-icon">🆕</div>
                <div className="option-title">No, arranco de cero</div>
                <div className="option-desc">Usá la plantilla básica de Ritto, la puedo cambiar después</div>
              </div>
            </div>

            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setStep(1)}>← Atrás</button>
              <button className="btn-primary" disabled={!hasColumns} onClick={() => setStep(hasColumns === 'yes' ? 3 : 4)}>
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card card-wide">
            <div className="step-tag">Paso 3 de 4</div>
            <div className="card-title">¿Cómo se llaman tus columnas?</div>
            <div className="card-sub">Poné los mismos nombres que tiene tu planilla en la primera columna. En la segunda elegís qué dato de Ritto va ahí.</div>

            <div className="tip-box">
              <strong>Ejemplo:</strong> si tu planilla tiene una columna que se llama "Empresa proveedora", escribís eso. Si tiene "Fecha de emisión", escribís eso. Exactamente igual.
            </div>

            <div className="col-header">
              <span />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Nombre en tu planilla</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Dato de Ritto</span>
              <span />
            </div>

            {excelColumns.map((col, i) => (
              <div key={col.id} className="col-row">
                <span className="col-num">{i + 1}</span>
                <input
                  className="col-label-input"
                  type="text"
                  value={col.label}
                  placeholder="Nombre de columna"
                  onChange={(e) => updateColumn(col.id, 'label', e.target.value)}
                />
                <select
                  className="col-field-select"
                  value={col.field}
                  onChange={(e) => updateColumn(col.id, 'field', e.target.value)}
                >
                  {RITTO_FIELDS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <button className="col-remove" type="button" onClick={() => removeColumn(col.id)}>×</button>
              </div>
            ))}

            <div className="col-actions">
              <button type="button" className="btn-add-col" onClick={addColumn}>+ Agregar columna</button>
              <button type="button" className="btn-reset-col" onClick={() => setExcelColumns(DEFAULT_COLUMNS.map((c) => ({ ...c })))}>Restaurar por defecto</button>
            </div>

            <div className="btn-row">
              <button className="btn-secondary" onClick={() => setStep(2)}>← Atrás</button>
              <button className="btn-primary" onClick={() => setStep(4)}>
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div className="step-tag" style={{ textAlign: 'center' }}>Paso 4 de 4</div>
            <div className="final-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="card-title" style={{ textAlign: 'center' }}>¡Todo listo, {firstName}!</div>
            <div className="card-sub" style={{ textAlign: 'center', marginBottom: 24 }}>
              Ritto está configurado. Empezá subiendo tu primera factura — en segundos tenés los datos extraídos.
            </div>

            <div className="final-list" style={{ textAlign: 'left' }}>
              <div className="final-item">
                <div className="final-check">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span>Subís XMLs, PDFs o fotos de facturas</span>
              </div>
              <div className="final-item">
                <div className="final-check">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span>Ritto extrae todos los datos automáticamente</span>
              </div>
              <div className="final-item">
                <div className="final-check">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span>Descargás el Excel con {hasColumns === 'yes' ? 'las columnas que configuraste' : 'la plantilla básica de Ritto'}</span>
              </div>
              <div className="final-item">
                <div className="final-check">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0a7c59" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span>Pegás las filas en tu planilla y listo</span>
              </div>
            </div>

            <button
              className="btn-primary"
              disabled={saving}
              onClick={() => finish(hasColumns === 'yes' ? excelColumns : DEFAULT_COLUMNS)}
            >
              {saving ? 'Guardando…' : 'Empezar a usar Ritto →'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
