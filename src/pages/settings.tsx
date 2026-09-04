import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import type { ExcelColumn } from '../lib/types';
import { RITTO_FIELDS, DEFAULT_COLUMNS } from '../lib/types';

const PLAN_LIMITS: Record<string, number> = { pro: 1, pyme: 5, empresa: 20 };

interface Profile {
  nombre: string;
  empresa: string;
  rut: string;
  telefono: string;
  plan?: string;
  trial_ends_at?: string | null;
  subscription_status?: string;
  organization_id?: string | null;
  role?: string;
}

interface Member {
  id: string;
  nombre: string | null;
  email?: string | null;
}

interface Invite {
  id: string;
  email: string;
  created_at: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [profile, setProfile] = useState<Profile>({ nombre: '', empresa: '', rut: '', telefono: '' });
  const [excelColumns, setExcelColumns] = useState<ExcelColumn[]>(DEFAULT_COLUMNS.map((c) => ({ ...c })));
  const [savingMapping, setSavingMapping] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [savingSheet, setSavingSheet] = useState(false);
  const [sheetMsg, setSheetMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string | undefined>();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [savingSheetMapping, setSavingSheetMapping] = useState(false);
  const [mappingMsg, setMappingMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [structureLoaded, setStructureLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return; }
      const data = { user: session.user };
      setUser(data.user);
      setAccessToken(session.access_token);
      supabase.from('profiles').select('*').eq('id', data.user.id).single().then(({ data: p }) => {
        if (p) {
          setProfile({
            nombre: p.nombre ?? '',
            empresa: p.empresa ?? '',
            rut: p.rut ?? '',
            telefono: p.telefono ?? '',
            plan: p.plan,
            trial_ends_at: p.trial_ends_at,
            subscription_status: p.subscription_status,
            organization_id: p.organization_id,
            role: p.role,
          });
          if (Array.isArray(p.excel_mapping) && p.excel_mapping.length > 0) {
            setExcelColumns(p.excel_mapping as ExcelColumn[]);
          }
          if (p.google_sheet_id) setGoogleSheetUrl(p.google_sheet_id);
          if (p.google_access_token) setGoogleConnected(true);
          if (p.sheet_column_mapping && typeof p.sheet_column_mapping === 'object') {
            setColumnMapping(p.sheet_column_mapping as Record<string, string>);
          }
          if (p.trial_ends_at && p.subscription_status === 'trial') {
            const days = Math.max(0, Math.ceil((new Date(p.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
            setTrialDaysLeft(days);
          }
          if (p.plan) setPlanName(p.plan.charAt(0).toUpperCase() + p.plan.slice(1));

          if (p.organization_id && p.role === 'owner' && p.plan && p.plan !== 'pro') {
            loadTeam(p.organization_id, data.user.id);
          }
        }
        setLoading(false);
      });
    });
  }, [router]);

  useEffect(() => {
    if (router.query.google === 'connected') {
      setSuccess('¡Cuenta de Google conectada exitosamente!');
      setGoogleConnected(true);
      setTimeout(() => setSuccess(''), 4000);
    }
    if (router.query.error === 'google_denied') {
      setError('Cancelaste la autorización de Google. Intentá de nuevo.');
    }
    if (router.query.error === 'google_csrf') {
      setError('Error de seguridad al conectar con Google (cookie inválida). Intentá de nuevo.');
    }
    if (router.query.error === 'google_token') {
      const detail = router.query.detail ? ` (${router.query.detail})` : '';
      setError(`No se pudo conectar con Google${detail}. Intentá de nuevo o escribinos a soporte@ritto.lat si el problema persiste.`);
    }
    if (router.query.error === 'google_not_configured') {
      setError('Hubo un problema del lado del servidor al conectar con Google. Escribinos a soporte@ritto.lat y lo resolvemos en minutos.');
    }
  }, [router.query]);

  async function loadTeam(orgId: string, myId: string) {
    const { data: mems } = await supabase
      .from('profiles')
      .select('id, nombre')
      .eq('organization_id', orgId)
      .neq('id', myId);
    setMembers(mems ?? []);

    const { data: inv } = await supabase
      .from('org_invites')
      .select('id, email, created_at')
      .eq('organization_id', orgId)
      .eq('status', 'pending');
    setInvites(inv ?? []);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('profiles').upsert({
      id: user.id,
      nombre: profile.nombre,
      empresa: profile.empresa,
      rut: profile.rut || null,
      telefono: profile.telefono || null,
    });
    if (err) setError('Error al guardar. Intentá de nuevo.');
    else { setSuccess('Cambios guardados'); setTimeout(() => setSuccess(''), 3000); }
    setSaving(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    if (newPassword.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setSavingPassword(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) setError('No se pudo cambiar la contraseña: ' + err.message);
    else { setSuccess('Contraseña actualizada'); setNewPassword(''); setConfirmPassword(''); setTimeout(() => setSuccess(''), 3000); }
    setSavingPassword(false);
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!profile.organization_id || !user) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;

    const limit = PLAN_LIMITS[profile.plan ?? 'pro'];
    if (members.length + 1 >= limit) {
      setError(`El plan ${planName} permite máximo ${limit} usuarios. Mejorá el plan para agregar más.`);
      return;
    }

    setInviting(true);
    setError('');
    const { error: err } = await supabase.from('org_invites').insert({
      organization_id: profile.organization_id,
      email,
      invited_by: user.id,
      status: 'pending',
    });
    if (err) {
      setError(err.code === '23505' ? 'Ya hay una invitación pendiente para ese email.' : 'Error al enviar invitación.');
    } else {
      setInviteEmail('');
      setSuccess('Invitación enviada. Cuando el usuario se registre con ese email queda vinculado automáticamente.');
      setTimeout(() => setSuccess(''), 5000);
      if (profile.organization_id) loadTeam(profile.organization_id, user.id);
    }
    setInviting(false);
  }

  async function removeMember(memberId: string) {
    setRemovingId(memberId);
    await supabase.from('profiles').update({ organization_id: null, role: null }).eq('id', memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setRemovingId(null);
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

  async function saveMapping() {
    if (!user) return;
    setSavingMapping(true);
    setError('');
    const { error: err } = await supabase.from('profiles').update({ excel_mapping: excelColumns }).eq('id', user.id);
    if (err) setError('Error al guardar la plantilla.');
    else { setSuccess('Plantilla guardada'); setTimeout(() => setSuccess(''), 3000); }
    setSavingMapping(false);
  }

  const MAPPING_FIELDS = [
    { value: 'proveedor', label: 'Proveedor / Empresa' },
    { value: 'rut', label: 'RUT / CUIT / ID fiscal' },
    { value: 'fecha', label: 'Fecha' },
    { value: 'nroDocumento', label: 'Nro. de documento' },
    { value: 'tipoDocumento', label: 'Tipo de comprobante' },
    { value: 'moneda', label: 'Moneda' },
    { value: 'neto', label: 'Neto (sin IVA)' },
    { value: 'ivaTotal', label: 'IVA Total' },
    { value: 'total', label: 'Total' },
  ];

  function guessMapping(headers: string[]): Record<string, string> {
    function norm(s: string) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); }
    const GUESSES: Record<string, string[]> = {
      proveedor: ['proveedor','empresa','nombre','razon','emisor','comercio','distribuidor','supplier','vendedor'],
      rut: ['rut','cuit','nit','documento','fiscal','ruc'],
      fecha: ['fecha','date'],
      nroDocumento: ['numero','nro','factura','comprobante','n'],
      tipoDocumento: ['tipo'],
      moneda: ['moneda','currency','divisa'],
      neto: ['neto','subtotal','base','importe'],
      ivaTotal: ['iva','impuesto','tax'],
      total: ['total','monto','importe','amount'],
    };
    const result: Record<string, string> = {};
    for (const [field, aliases] of Object.entries(GUESSES)) {
      const match = headers.find((h) => aliases.some((a) => norm(h).includes(a) || a.includes(norm(h))));
      if (match) result[field] = match;
    }
    return result;
  }

  async function detectColumns() {
    if (!user) return;
    setLoadingStructure(true);
    setMappingMsg(null);
    try {
      const res = await fetch('/api/sheets/structure', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setMappingMsg({ type: 'err', text: data.error ?? 'No se pudo leer la planilla.' });
        return;
      }
      const headers: string[] = data.sampleHeaders ?? [];
      setSheetHeaders(headers);
      setStructureLoaded(true);
      setColumnMapping((prev) => {
        const guessed = guessMapping(headers);
        const kept = Object.fromEntries(Object.entries(prev).filter(([, v]) => v && headers.includes(v)));
        return { ...guessed, ...kept };
      });
    } catch {
      setMappingMsg({ type: 'err', text: 'Error de conexión.' });
    } finally {
      setLoadingStructure(false);
    }
  }

  async function saveSheetMapping() {
    if (!user) return;
    setSavingSheetMapping(true);
    setMappingMsg(null);
    try {
      const res = await fetch('/api/sheets/save-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ mapping: columnMapping }),
      });
      if (res.ok) {
        setMappingMsg({ type: 'ok', text: '✓ Mapeo guardado. Ritto ya sabe dónde poner cada dato en tu planilla.' });
      } else {
        const d = await res.json();
        setMappingMsg({ type: 'err', text: d.error ?? 'Error al guardar.' });
      }
    } catch {
      setMappingMsg({ type: 'err', text: 'Error de conexión.' });
    } finally {
      setSavingSheetMapping(false);
    }
  }

  async function saveSheetUrl() {
    if (!user) return;
    setSavingSheet(true);
    setSheetMsg(null);
    try {
      const res = await fetch('/api/sheets/save-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ sheetUrl: googleSheetUrl }),
      });
      let data: Record<string, unknown> = {};
      try { data = await res.json(); } catch { /* non-JSON response */ }
      if (!res.ok) {
        setSheetMsg({ type: 'err', text: (data.error as string) ?? `Error ${res.status} al guardar la URL.` });
      } else {
        setSheetMsg({ type: 'ok', text: 'URL guardada correctamente ✓' });
        setTimeout(() => setSheetMsg(null), 6000);
      }
    } catch {
      setSheetMsg({ type: 'err', text: 'Error de conexión. Revisá tu internet.' });
    }
    setSavingSheet(false);
  }

  async function disconnectGoogle() {
    if (!user) return;
    await supabase.from('profiles').update({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expires_at: null,
    }).eq('id', user.id);
    setGoogleConnected(false);
    setSuccess('Google desconectado');
    setTimeout(() => setSuccess(''), 3000);
  }

  async function cancelInvite(inviteId: string) {
    await supabase.from('org_invites').delete().eq('id', inviteId);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  }

  const isMultiUserPlan = profile.plan && profile.plan !== 'pro';
  const isOwner = profile.role === 'owner';

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
        .page-wrap { padding: 28px 28px 80px; max-width: 640px; }
        .page-title { font-family: 'DM Serif Display', serif; font-size: 28px; margin-bottom: 24px; }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 14px; padding: 24px; margin-bottom: 16px; }
        .card-title { font-size: 14px; font-weight: 700; margin-bottom: 16px; color: var(--dark); display: flex; align-items: center; gap: 8px; }
        .field { margin-bottom: 14px; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
        label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 5px; color: var(--gray); }
        input[type="text"], input[type="tel"], input[type="email"], input[type="password"] {
          width: 100%; padding: 10px 13px; border: 1px solid var(--border);
          border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 15px;
          outline: none; transition: border-color 0.15s;
        }
        input:focus { border-color: var(--green); }
        input:disabled { background: var(--bg); color: var(--gray); cursor: not-allowed; }
        .btn-save { background: var(--green); color: #fff; border: none; padding: 11px 28px; border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-danger { background: none; border: 1px solid #fecaca; color: var(--red); padding: 11px 28px; border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 500; cursor: pointer; width: 100%; }
        .btn-sm { background: none; border: 1px solid var(--border); color: var(--gray); padding: 5px 12px; border-radius: 6px; font-family: 'Figtree', sans-serif; font-size: 12px; font-weight: 500; cursor: pointer; }
        .btn-sm:hover { border-color: var(--red); color: var(--red); }
        .btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }
        .success-bar { background: var(--green-light); color: var(--green); border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 500; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .error-bar { background: var(--red-light); color: var(--red); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
        .form-footer { display: flex; justify-content: flex-end; margin-top: 4px; }
        .col-row { display: grid; grid-template-columns: 22px 1fr 1fr 28px; gap: 8px; align-items: center; margin-bottom: 8px; }
        .col-num { font-size: 12px; color: var(--gray); text-align: right; font-weight: 500; padding-top: 2px; }
        .col-label-input { padding: 8px 10px; border: 1px solid var(--border); border-radius: 7px; font-family: 'Figtree', sans-serif; font-size: 13px; outline: none; width: 100%; }
        .col-label-input:focus { border-color: var(--green); }
        .col-field-select { padding: 8px 10px; border: 1px solid var(--border); border-radius: 7px; font-family: 'Figtree', sans-serif; font-size: 13px; background: var(--white); outline: none; cursor: pointer; width: 100%; }
        .col-remove { background: none; border: none; color: var(--gray); font-size: 18px; cursor: pointer; padding: 2px; border-radius: 4px; line-height: 1; }
        .col-remove:hover { color: var(--red); }
        .col-actions { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
        .btn-add-col { background: none; border: 1.5px dashed var(--border); color: var(--gray); padding: 7px 14px; border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 13px; cursor: pointer; }
        .btn-add-col:hover { border-color: var(--green); color: var(--green); }
        .btn-reset-col { background: none; border: 1px solid var(--border); color: var(--gray); padding: 7px 14px; border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 13px; cursor: pointer; }
        .col-header { display: grid; grid-template-columns: 22px 1fr 1fr 28px; gap: 8px; margin-bottom: 6px; }
        .member-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--bg); gap: 8px; }
        .member-row:last-child { border-bottom: none; }
        .member-name { font-size: 13px; font-weight: 500; }
        .member-sub { font-size: 12px; color: var(--gray); }
        .invite-row { display: flex; gap: 8px; }
        .invite-row input { flex: 1; }
        .btn-invite { background: var(--green); color: #fff; border: none; padding: 10px 18px; border-radius: 8px; font-family: 'Figtree', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .btn-invite:disabled { opacity: 0.6; cursor: not-allowed; }
        .pending-tag { display: inline-block; background: #fef3c7; color: #92400e; border-radius: 20px; padding: 2px 8px; font-size: 11px; font-weight: 600; }
        .plan-badge { background: var(--green-light); color: var(--green); border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 600; }
        .team-limit { font-size: 12px; color: var(--gray); margin-bottom: 14px; }
        @media (max-width: 768px) {
          .page-wrap { padding: 18px 16px 80px; }
          .field-row { grid-template-columns: 1fr; gap: 0; }
          .page-title { font-size: 22px; }
          .sistema-grid { grid-template-columns: 1fr; }
          .invite-row { flex-direction: column; }
        }
      `}</style>

      <Sidebar active="settings" userEmail={user?.email} empresa={profile.empresa} trialDaysLeft={trialDaysLeft} planName={planName} />

      <div className="with-sidebar">
        <div className="page-wrap">
          <h1 className="page-title">Configuración</h1>

          {success && <div className="success-bar">✓ {success}</div>}
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

            <div className="form-footer" style={{ marginBottom: 16 }}>
              <button className="btn-save" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>

          <div className="card">
            <div className="card-title">Plantilla de Excel</div>
            <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 16, lineHeight: 1.6 }}>
              Definí las columnas del archivo que descargás. Podés usar exactamente los mismos nombres que tiene tu planilla — así los datos caen en el lugar correcto.
            </p>

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
                <button className="col-remove" type="button" onClick={() => removeColumn(col.id)}>&times;</button>
              </div>
            ))}

            <div className="col-actions">
              <button type="button" className="btn-add-col" onClick={addColumn}>+ Agregar columna</button>
              <button type="button" className="btn-reset-col" onClick={() => setExcelColumns(DEFAULT_COLUMNS.map((c) => ({ ...c })))}>Restaurar por defecto</button>
            </div>

            <div className="form-footer" style={{ marginTop: 16 }}>
              <button type="button" className="btn-save" onClick={saveMapping} disabled={savingMapping}>
                {savingMapping ? 'Guardando…' : 'Guardar plantilla'}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <span>Google Sheets</span>
              {googleConnected && (
                <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>Conectado</span>
              )}
            </div>

            {!googleConnected && (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#0369a1', marginBottom: 6 }}>Paso 1 — Conectá tu cuenta de Google</p>
                <p style={{ fontSize: 13, color: '#0369a1', lineHeight: 1.6 }}>
                  Hacé clic en "Conectar con Google" y autorizá el acceso. Solo se pide permiso para escribir en Sheets — Ritto no puede leer ni modificar tus otros archivos.
                </p>
                <button
                  type="button"
                  className="btn-save"
                  style={{ marginTop: 12 }}
                  onClick={() => user && (window.location.href = `/api/auth/google?userId=${user.id}`)}
                >
                  Conectar con Google →
                </button>
              </div>
            )}

            <div style={{ background: googleConnected ? 'var(--bg)' : '#f8fafc', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, opacity: googleConnected ? 1 : 0.6 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>{googleConnected ? 'URL de tu Google Sheet' : 'Paso 2 — URL de tu Google Sheet'}</p>
              <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 10, lineHeight: 1.6 }}>
                Abrí tu planilla en Google Sheets y copiá la dirección de la barra del navegador. Se ve así:<br />
                <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#e2e8f0', borderRadius: 4, padding: '2px 6px', display: 'inline-block', marginTop: 4, wordBreak: 'break-all' }}>
                  https://docs.google.com/spreadsheets/d/<strong>TU_ID</strong>/edit
                </span>
              </p>
              <input
                type="text"
                value={googleSheetUrl}
                onChange={(e) => setGoogleSheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                disabled={!googleConnected}
                style={{ width: '100%', padding: '10px 13px', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'Figtree, sans-serif', fontSize: 14, outline: 'none', marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" className="btn-save" onClick={saveSheetUrl} disabled={savingSheet || !googleConnected}>
                  {savingSheet ? 'Guardando…' : 'Guardar URL'}
                </button>
                {googleConnected && (
                  <button type="button" onClick={disconnectGoogle} style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                    Desconectar Google
                  </button>
                )}
              </div>
              {sheetMsg && (
                <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: sheetMsg.type === 'ok' ? 'var(--green-light)' : 'var(--red-light)', color: sheetMsg.type === 'ok' ? 'var(--green)' : 'var(--red)' }}>
                  {sheetMsg.text}
                </div>
              )}
            </div>

            {googleConnected && googleSheetUrl && (
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>Paso 3 — Decile a Ritto en qué columna de tu planilla va cada dato (opcional)</p>
                <p style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 8, lineHeight: 1.5 }}>
                  Ritto escribe los datos del comprobante en las columnas que vos eligas. Todo lo demás (estados, fórmulas, "Mes pagado", deudas, etc.) lo deja intacto — esas columnas son tuyas.
                </p>
                <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#854d0e', marginBottom: 12, lineHeight: 1.5 }}>
                  <strong>¿Para qué sirve?</strong> Si tu planilla tiene una columna que se llama "Tt N° factura" o "Fecha de emisión", acá le decís a Ritto exactamente cuál es. Hacé clic en "Leer mi planilla" y Ritto te muestra las columnas que encontró para que las asignes vos.
                </div>
                {!structureLoaded ? (
                  <button
                    type="button"
                    className="btn-save"
                    style={{ background: '#0369a1' }}
                    onClick={detectColumns}
                    disabled={loadingStructure}
                  >
                    {loadingStructure ? 'Leyendo planilla…' : 'Leer mi planilla y ver columnas →'}
                  </button>
                ) : (
                  <>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1d4ed8', marginBottom: 12, lineHeight: 1.5 }}>
                      <strong>Cómo funciona:</strong> A la izquierda están los datos que Ritto puede escribir. A la derecha, las columnas de TU planilla. Si tu planilla tiene una columna para ese dato, seleccionála. Si no tenés esa columna, dejá "— no escribir —" y Ritto la saltea. No tenés que llenar todo — solo los que aplican a tu planilla.
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--dark)', fontWeight: 600, marginBottom: 12 }}>
                      Encontramos {sheetHeaders.length} columna{sheetHeaders.length !== 1 ? 's' : ''} en total entre todas las pestañas de tu planilla.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: '0 8px', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.4px', paddingBottom: 6, borderBottom: '2px solid var(--border)' }}>Ritto escribe este dato…</span>
                      <span style={{ borderBottom: '2px solid var(--border)' }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.4px', paddingBottom: 6, borderBottom: '2px solid var(--border)' }}>…en esta columna de tu planilla</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {MAPPING_FIELDS.map((f) => (
                        <div key={f.value} style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: '0 8px', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--dark)' }}>{f.label}</span>
                          <span style={{ color: '#aaa', fontSize: 14, textAlign: 'center' }}>→</span>
                          <select
                            style={{ border: `1px solid ${columnMapping[f.value] ? '#86efac' : 'var(--border)'}`, borderRadius: 7, padding: '7px 10px', fontFamily: 'inherit', fontSize: 13, background: columnMapping[f.value] ? '#f0fdf4' : 'var(--white)', color: columnMapping[f.value] ? '#166534' : 'inherit', outline: 'none', cursor: 'pointer', width: '100%' }}
                            value={columnMapping[f.value] ?? ''}
                            onChange={(e) => setColumnMapping((prev) => ({ ...prev, [f.value]: e.target.value }))}
                          >
                            <option value="">— no escribir —</option>
                            {sheetHeaders.map((h) => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 12, lineHeight: 1.5 }}>
                      Las columnas que dejás en "— no escribir —" y las que no aparecen en este listado (como "Mes", "Pendiente", fórmulas, etc.) Ritto las ignora completamente — quedan tal como están.
                    </p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button type="button" className="btn-save" onClick={saveSheetMapping} disabled={savingSheetMapping}>
                        {savingSheetMapping ? 'Guardando…' : 'Guardar configuración'}
                      </button>
                      <button type="button" onClick={detectColumns} disabled={loadingStructure} style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                        {loadingStructure ? 'Leyendo…' : 'Volver a leer la planilla'}
                      </button>
                    </div>
                  </>
                )}
                {mappingMsg && (
                  <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: mappingMsg.type === 'ok' ? 'var(--green-light)' : 'var(--red-light)', color: mappingMsg.type === 'ok' ? 'var(--green)' : 'var(--red)' }}>
                    {mappingMsg.text}
                  </div>
                )}
                {Object.values(columnMapping).some(Boolean) && !structureLoaded && (
                  <p style={{ fontSize: 12, color: 'var(--green)', marginTop: 8 }}>✓ Mapeo guardado anteriormente</p>
                )}
              </div>
            )}
          </div>

          <form onSubmit={changePassword}>
            <div className="card">
              <div className="card-title">Cambiar contraseña</div>
              <div className="field-row">
                <div>
                  <label>Nueva contraseña</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} />
                </div>
                <div>
                  <label>Confirmar contraseña</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repetí la contraseña" />
                </div>
              </div>
              <div className="form-footer">
                <button className="btn-save" type="submit" disabled={savingPassword || !newPassword}>
                  {savingPassword ? 'Actualizando…' : 'Cambiar contraseña'}
                </button>
              </div>
            </div>
          </form>

          {isMultiUserPlan && isOwner && (
            <div className="card">
              <div className="card-title">
                Equipo
                {profile.plan && (
                  <span className="plan-badge">Plan {planName} · hasta {PLAN_LIMITS[profile.plan]} usuarios</span>
                )}
              </div>
              <p className="team-limit">
                {members.length} miembro{members.length !== 1 ? 's' : ''} + vos · {invites.length} invitación{invites.length !== 1 ? 'es' : ''} pendiente{invites.length !== 1 ? 's' : ''}
              </p>

              {members.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  {members.map((m) => (
                    <div key={m.id} className="member-row">
                      <div>
                        <div className="member-name">{m.nombre || 'Sin nombre'}</div>
                      </div>
                      <button
                        className="btn-sm"
                        disabled={removingId === m.id}
                        onClick={() => removeMember(m.id)}
                      >
                        {removingId === m.id ? '…' : 'Remover'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {invites.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  {invites.map((inv) => (
                    <div key={inv.id} className="member-row">
                      <div>
                        <div className="member-name">{inv.email}</div>
                        <div className="member-sub"><span className="pending-tag">Pendiente</span> · invitado el {new Date(inv.created_at).toLocaleDateString('es-UY')}</div>
                      </div>
                      <button className="btn-sm" onClick={() => cancelInvite(inv.id)}>Cancelar</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <label style={{ marginBottom: 8, display: 'block' }}>Invitar por email</label>
                <form onSubmit={sendInvite}>
                  <div className="invite-row">
                    <input
                      type="email"
                      placeholder="colega@empresa.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                    <button className="btn-invite" type="submit" disabled={inviting}>
                      {inviting ? '…' : 'Invitar'}
                    </button>
                  </div>
                </form>
                <p style={{ fontSize: 12, color: 'var(--gray)', marginTop: 8, lineHeight: 1.5 }}>
                  Cuando esa persona se registre con ese email, queda vinculada automáticamente a tu organización.
                </p>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-title">Cuenta</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn-save" style={{ background: 'var(--gray)' }} onClick={() => router.push('/plan')}>Ver mi plan</button>
              <button className="btn-danger" style={{ width: 'auto' }} onClick={async () => { await supabase.auth.signOut(); router.replace('/login'); }}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
