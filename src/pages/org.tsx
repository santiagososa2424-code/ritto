import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';

const PLAN_SEATS: Record<string, number> = { pyme: 5, empresa: 20 };
const PLAN_LABEL: Record<string, string> = { pyme: 'Pyme', empresa: 'Empresa' };

interface Member {
  id: string;
  email: string;
  role: string;
  status: string;
  invite_url: string | null;
  user_id: string | null;
  profile?: { nombre?: string; empresa?: string } | null;
}

interface MemberViewItem {
  id: string;
  role: string;
  status: string;
  name: string | null;
}

interface PanelMember {
  memberId: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  invoiceCount: number;
  invoiceTotal: number;
  lastInvoiceDate: string | null;
}

interface Org {
  id: string;
  name: string;
  plan: string;
}

export default function OrgPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [org, setOrg] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberView, setMemberView] = useState<MemberViewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [copied, setCopied] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<string | undefined>();
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [planName, setPlanName] = useState<string | undefined>();
  const [panelData, setPanelData] = useState<PanelMember[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return; }
      setUser(session.user);
      setAccessToken(session.access_token);
      const token = session.access_token;

      supabase.from('profiles').select('empresa, plan, trial_ends_at, subscription_status').eq('id', session.user.id).single()
        .then(({ data: p }) => {
          if (!p) return;
          if (p.empresa) setEmpresa(p.empresa);
          if (p.plan) setPlanName(PLAN_LABEL[p.plan] ?? p.plan);
          if (p.trial_ends_at && p.subscription_status === 'trial') {
            setTrialDaysLeft(Math.max(0, Math.ceil((new Date(p.trial_ends_at).getTime() - Date.now()) / 86400000)));
          }
        });

      // Try owner view first; fall back to member view
      const ownerRes = await fetch('/api/org/members', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ownerRes.ok) {
        const d = await ownerRes.json();
        setIsOwner(true);
        if (d.org) { setOrg(d.org); setMembers(d.members ?? []); }
        setPanelLoading(true);
        fetch('/api/org/leader-panel', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(pd => { if (pd) setPanelData(pd.panel ?? []); })
          .finally(() => setPanelLoading(false));
      } else {
        // Try member view (non-owner)
        const memberRes = await fetch('/api/org/member-view', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (memberRes.ok) {
          const d = await memberRes.json();
          if (d.org) { setOrg(d.org); setMemberView(d.members ?? []); }
        }
      }
      setLoading(false);
    });
  }, [router]);

  async function loadMembers(token: string) {
    const res = await fetch('/api/org/members', { headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    if (d.org) { setOrg(d.org); setMembers(d.members ?? []); }
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError('');
    setInviteUrl('');
    const res = await fetch('/api/org/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    });
    const d = await res.json();
    if (res.ok) {
      setInviteUrl(d.invite_url);
      setInviteEmail('');
      loadMembers(accessToken);
    } else {
      setInviteError(d.error ?? 'Error al invitar');
    }
    setInviting(false);
  }

  async function removeMember(memberId: string) {
    setRemoving(memberId);
    await fetch('/api/org/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ memberId }),
    });
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setRemoving(null);
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  const maxSeats = org ? (PLAN_SEATS[org.plan] ?? 5) : 5;
  const activeCount = members.filter((m) => m.status === 'active').length;
  const pendingCount = members.filter((m) => m.status === 'pending').length;

  if (!user) return null;

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --green: #0a7c59; --green-light: #e6f4ef; --bg: #f5f5f7; --dark: #111111; --gray: #6b6b6b; --border: #e0e0e0; --white: #ffffff; --red: #dc2626; }
        body { font-family: 'Figtree', sans-serif; background: var(--bg); color: var(--dark); }
        .page-wrap { padding: 28px 28px 80px; max-width: 860px; }
        .page-title { font-family: 'DM Serif Display', serif; font-size: 28px; color: var(--dark); margin-bottom: 4px; }
        .page-sub { font-size: 14px; color: var(--gray); margin-bottom: 28px; }
        .card { background: var(--white); border: 1px solid var(--border); border-radius: 16px; padding: 24px 28px; margin-bottom: 20px; }
        .card-title { font-size: 15px; font-weight: 700; color: var(--dark); margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
        .card-sub { font-size: 13px; color: var(--gray); margin-bottom: 20px; }
        .seat-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .seat-track { flex: 1; height: 6px; background: var(--bg); border-radius: 99px; overflow: hidden; }
        .seat-fill { height: 100%; background: var(--green); border-radius: 99px; transition: width 0.3s; }
        .seat-label { font-size: 13px; font-weight: 600; color: var(--dark); white-space: nowrap; }
        .invite-row { display: flex; gap: 10px; align-items: center; }
        .invite-input { flex: 1; padding: 10px 13px; border: 1.5px solid var(--border); border-radius: 9px; font-family: 'Figtree', sans-serif; font-size: 14px; outline: none; }
        .invite-input:focus { border-color: var(--green); }
        .btn-invite { background: var(--green); color: #fff; border: none; padding: 10px 18px; border-radius: 9px; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; }
        .btn-invite:disabled { opacity: 0.5; cursor: not-allowed; }
        .invite-url-box { margin-top: 14px; background: var(--green-light); border: 1px solid rgba(10,124,89,0.2); border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; }
        .invite-url-text { flex: 1; font-size: 13px; color: #0a5c44; word-break: break-all; }
        .btn-copy { background: var(--green); color: #fff; border: none; padding: 6px 12px; border-radius: 7px; font-family: 'Figtree', sans-serif; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
        .error-msg { color: var(--red); font-size: 13px; margin-top: 8px; }
        .member-list { display: flex; flex-direction: column; gap: 8px; }
        .member-row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #fafafa; border: 1px solid var(--border); border-radius: 10px; }
        .member-avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--green-light); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: var(--green); flex-shrink: 0; }
        .member-info { flex: 1; min-width: 0; }
        .member-name { font-size: 14px; font-weight: 600; color: var(--dark); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .member-email { font-size: 12px; color: var(--gray); margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .status-badge { padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; flex-shrink: 0; }
        .status-active { background: #dcfce7; color: #166534; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-owner { background: var(--green-light); color: var(--green); }
        .btn-remove { background: none; border: 1px solid var(--border); color: var(--gray); padding: 5px 10px; border-radius: 7px; font-family: 'Figtree', sans-serif; font-size: 12px; cursor: pointer; flex-shrink: 0; }
        .btn-remove:hover { border-color: var(--red); color: var(--red); }
        .btn-remove:disabled { opacity: 0.4; cursor: not-allowed; }
        .pending-link { font-size: 11px; color: var(--gray); margin-top: 3px; display: flex; align-items: center; gap: 6px; }
        .btn-copy-sm { background: none; border: 1px solid var(--border); color: var(--green); padding: 2px 8px; border-radius: 5px; font-family: 'Figtree', sans-serif; font-size: 11px; cursor: pointer; white-space: nowrap; }
        .empty-state { text-align: center; padding: 30px; color: var(--gray); font-size: 14px; }
        .plan-chip { background: var(--green-light); color: var(--green); border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .member-only-badge { background: #eff6ff; color: #1d4ed8; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 600; }
      `}</style>

      <Sidebar active="org" userEmail={user.email} empresa={empresa} trialDaysLeft={trialDaysLeft} planName={planName} showOrg />

      <div className="with-sidebar">
        <div className="page-wrap">
          <h1 className="page-title">Mi Organización</h1>
          <p className="page-sub">
            {isOwner ? 'Gestioná las cuentas de tu equipo y los accesos.' : 'Tu organización y compañeros de equipo.'}
          </p>

          {loading ? (
            <div style={{ color: 'var(--gray)', fontSize: 14, padding: 20 }}>Cargando…</div>
          ) : !org ? (
            <div className="card">
              <div className="empty-state">
                <div style={{ fontSize: 36, marginBottom: 10 }}>🏢</div>
                <div style={{ fontWeight: 600, color: 'var(--dark)', marginBottom: 6 }}>Sin organización activa</div>
                <div>Activá un plan Pyme o Empresa para gestionar múltiples cuentas.</div>
              </div>
            </div>
          ) : isOwner ? (
            <>
              {/* Owner view — full management */}
              <div className="card">
                <div className="card-title">
                  {org.name}
                  <span className="plan-chip">Plan {PLAN_LABEL[org.plan] ?? org.plan}</span>
                </div>
                <div className="card-sub">
                  {activeCount} activo{activeCount !== 1 ? 's' : ''}{pendingCount > 0 ? `, ${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''}` : ''} · máximo {maxSeats} cuentas
                </div>
                <div className="seat-bar">
                  <div className="seat-track">
                    <div className="seat-fill" style={{ width: `${Math.min(100, ((activeCount + pendingCount) / maxSeats) * 100)}%` }} />
                  </div>
                  <span className="seat-label">{activeCount + pendingCount}/{maxSeats} asientos</span>
                </div>

                {activeCount + pendingCount < maxSeats ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Invitar nueva sucursal</div>
                    <div className="invite-row">
                      <input
                        className="invite-input"
                        type="email"
                        placeholder="email@sucursal.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
                      />
                      <button className="btn-invite" disabled={!inviteEmail.trim() || inviting} onClick={sendInvite}>
                        {inviting ? 'Invitando…' : 'Generar link →'}
                      </button>
                    </div>
                    {inviteError && <div className="error-msg">{inviteError}</div>}
                    {inviteUrl && (
                      <div className="invite-url-box">
                        <div className="invite-url-text">{inviteUrl}</div>
                        <button className="btn-copy" onClick={() => copyToClipboard(inviteUrl, 'new')}>
                          {copied === 'new' ? '¡Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 10 }}>
                      Compartí el link con la sucursal — al abrirlo pueden crear su cuenta de Ritto.
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: '#92400e', background: '#fef3c7', padding: '10px 14px', borderRadius: 8 }}>
                    Alcanzaste el límite de {maxSeats} cuentas para el plan {PLAN_LABEL[org.plan] ?? org.plan}.
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 16 }}>Cuentas del equipo</div>
                {members.length === 0 ? (
                  <div className="empty-state">Todavía no hay miembros</div>
                ) : (
                  <div className="member-list">
                    {members.map((m) => {
                      const initials = (m.profile?.nombre || m.email).slice(0, 2).toUpperCase();
                      const displayName = m.profile?.nombre || m.profile?.empresa || m.email;
                      return (
                        <div key={m.id} className="member-row">
                          <div className="member-avatar">{initials}</div>
                          <div className="member-info">
                            <div className="member-name">{displayName}</div>
                            <div className="member-email">{m.email}</div>
                            {m.status === 'pending' && m.invite_url && (
                              <div className="pending-link">
                                Link pendiente:
                                <button className="btn-copy-sm" onClick={() => copyToClipboard(m.invite_url!, m.id)}>
                                  {copied === m.id ? '¡Copiado!' : 'Copiar link'}
                                </button>
                              </div>
                            )}
                          </div>
                          <span className={`status-badge ${m.role === 'owner' ? 'status-owner' : m.status === 'active' ? 'status-active' : 'status-pending'}`}>
                            {m.role === 'owner' ? 'Dueño' : m.status === 'active' ? 'Activo' : 'Pendiente'}
                          </span>
                          {m.role !== 'owner' && (
                            <button
                              className="btn-remove"
                              disabled={removing === m.id}
                              onClick={() => removeMember(m.id)}
                            >
                              {removing === m.id ? '…' : 'Remover'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: 4 }}>Panel de Sucursales</div>
                <div className="card-sub">Resumen de facturas por cuenta del equipo.</div>
                {panelLoading ? (
                  <div style={{ color: 'var(--gray)', fontSize: 13 }}>Cargando…</div>
                ) : panelData.length === 0 ? (
                  <div className="empty-state">Sin datos de facturas todavía</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--gray)' }}>Cuenta</th>
                          <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--gray)' }}>Email</th>
                          <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: 'var(--gray)' }}>Facturas</th>
                          <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: 'var(--gray)' }}>Total acumulado</th>
                          <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--gray)' }}>Última factura</th>
                        </tr>
                      </thead>
                      <tbody>
                        {panelData.map((m) => (
                          <tr key={m.memberId} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 10px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--dark)' }}>{m.name}</div>
                              {m.role === 'owner' && <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>LÍDER</span>}
                            </td>
                            <td style={{ padding: '10px 10px', color: 'var(--gray)' }}>{m.email}</td>
                            <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600 }}>{m.invoiceCount}</td>
                            <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>
                              {m.invoiceTotal > 0 ? `$${m.invoiceTotal.toLocaleString('es-UY')}` : '—'}
                            </td>
                            <td style={{ padding: '10px 10px', color: 'var(--gray)' }}>{m.lastInvoiceDate ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Member view — read-only */
            <div className="card">
              <div className="card-title">
                {org.name}
                <span className="plan-chip">Plan {PLAN_LABEL[org.plan] ?? org.plan}</span>
                <span className="member-only-badge">Miembro</span>
              </div>
              <div className="card-sub" style={{ marginBottom: 20 }}>Sos parte de esta organización.</div>
              <div className="card-title" style={{ marginBottom: 12, fontSize: 13 }}>Compañeros de equipo</div>
              {memberView.length === 0 ? (
                <div className="empty-state">Sin otros miembros activos</div>
              ) : (
                <div className="member-list">
                  {memberView.map((m) => {
                    const initials = (m.name ?? 'U').slice(0, 2).toUpperCase();
                    return (
                      <div key={m.id} className="member-row">
                        <div className="member-avatar">{initials}</div>
                        <div className="member-info">
                          <div className="member-name">{m.name ?? 'Usuario'}</div>
                        </div>
                        <span className={`status-badge ${m.role === 'owner' ? 'status-owner' : 'status-active'}`}>
                          {m.role === 'owner' ? 'Líder' : 'Activo'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
