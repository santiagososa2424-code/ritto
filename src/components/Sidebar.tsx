import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

type ActivePage = 'facturas' | 'plan' | 'settings';

interface SidebarProps {
  active: ActivePage;
  userEmail?: string;
  trialDaysLeft?: number | null;
  planName?: string;
}

export default function Sidebar({ active, userEmail, trialDaysLeft, planName }: SidebarProps) {
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  const items = [
    {
      id: 'facturas' as const,
      label: 'Facturas',
      path: '/app',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <line x1="10" y1="9" x2="8" y2="9"/>
        </svg>
      ),
    },
    {
      id: 'plan' as const,
      label: 'Mi Plan',
      path: '/plan',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      ),
    },
    {
      id: 'settings' as const,
      label: 'Configuración',
      path: '/settings',
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      ),
    },
  ];

  const mobileIcons = [
    ...items,
    {
      id: 'logout' as const,
      label: 'Salir',
      path: '',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      ),
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&family=DM+Serif+Display:ital@0;1&display=swap');
        .sb-root {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: 240px; background: #0a7c59;
          display: flex; flex-direction: column;
          z-index: 50; overflow-y: auto;
          font-family: 'Figtree', sans-serif;
        }
        .sb-header {
          padding: 22px 20px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .sb-logo { font-family: 'DM Serif Display', serif; font-size: 24px; color: #fff; }
        .sb-tagline { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; font-weight: 500; }
        .sb-nav {
          flex: 1; padding: 12px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .sb-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; background: none; border: none;
          color: rgba(255,255,255,0.72); padding: 10px 12px;
          border-radius: 8px; font-family: 'Figtree', sans-serif;
          font-size: 14px; font-weight: 500; cursor: pointer;
          text-align: left; transition: background 0.1s, color 0.1s;
          -webkit-tap-highlight-color: transparent;
        }
        .sb-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .sb-item.sb-active { background: rgba(255,255,255,0.18); color: #fff; font-weight: 600; }
        .sb-sep { height: 1px; background: rgba(255,255,255,0.1); margin: 6px 12px; }
        .sb-footer {
          padding: 14px 16px 24px;
          border-top: 1px solid rgba(255,255,255,0.1);
          display: flex; flex-direction: column; gap: 8px;
        }
        .sb-trial {
          display: flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.12); border-radius: 7px;
          padding: 8px 10px; font-size: 12px; font-weight: 500;
          color: rgba(255,255,255,0.9);
        }
        .sb-trial-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #4ade80; flex-shrink: 0;
        }
        .sb-plan-tag {
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.5px;
          color: rgba(255,255,255,0.4);
        }
        .sb-email {
          font-size: 12px; color: rgba(255,255,255,0.55);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .sb-logout {
          background: none; border: none;
          color: rgba(255,255,255,0.45);
          font-family: 'Figtree', sans-serif; font-size: 13px;
          cursor: pointer; text-align: left; padding: 0;
        }
        .sb-logout:hover { color: rgba(255,255,255,0.85); }

        /* Layout */
        .with-sidebar { margin-left: 240px; min-height: 100vh; }

        /* Mobile bottom nav */
        .bottom-nav {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0;
          background: #fff; border-top: 1px solid #e0e0e0;
          height: 62px; z-index: 50;
          justify-content: space-around; align-items: center;
        }
        .bn-item {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          background: none; border: none; color: #8a8a8a;
          font-family: 'Figtree', sans-serif; font-size: 10px; font-weight: 500;
          cursor: pointer; padding: 6px 10px; flex: 1;
          -webkit-tap-highlight-color: transparent;
        }
        .bn-item.bn-active { color: #0a7c59; }

        @media (max-width: 768px) {
          .sb-root { display: none; }
          .with-sidebar { margin-left: 0; }
          .bottom-nav { display: flex; }
        }
      `}</style>

      <aside className="sb-root">
        <div className="sb-header">
          <div className="sb-logo">Ritto</div>
          <div className="sb-tagline">Gestión de facturas</div>
        </div>

        <nav className="sb-nav">
          {items.map((item) => (
            <button
              key={item.id}
              className={`sb-item${active === item.id ? ' sb-active' : ''}`}
              onClick={() => router.push(item.path)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}

          <div className="sb-sep" />

          <button
            className="sb-item"
            onClick={() => window.open('mailto:soporte@ritto.app', '_blank')}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span>Soporte</span>
          </button>
        </nav>

        <div className="sb-footer">
          {trialDaysLeft != null && trialDaysLeft >= 0 && (
            <div className="sb-trial">
              <span className="sb-trial-dot" />
              Trial · {trialDaysLeft} día{trialDaysLeft !== 1 ? 's' : ''} restante{trialDaysLeft !== 1 ? 's' : ''}
            </div>
          )}
          {planName && <div className="sb-plan-tag">Plan {planName}</div>}
          {userEmail && <div className="sb-email">{userEmail}</div>}
          <button className="sb-logout" onClick={signOut}>Cerrar sesión</button>
        </div>
      </aside>

      <nav className="bottom-nav">
        {mobileIcons.map((item) => (
          <button
            key={item.id}
            className={`bn-item${active === item.id ? ' bn-active' : ''}`}
            onClick={() => item.id === 'logout' ? signOut() : router.push(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
