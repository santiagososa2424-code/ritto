import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

type ErrorRow = {
  id: string;
  ocurrido: string;
  ambito: string;
  mensaje: string;
  stack: string | null;
  user_id: string | null;
  contexto: Record<string, unknown> | null;
};

// Cada cuánto se refresca. Quince segundos es suficiente para enterarse mientras el
// cliente todavía tiene la pantalla abierta, y no castiga la base.
const REFRESCO_MS = 15000;

export default function Errores() {
  const router = useRouter();
  const [errores, setErrores] = useState<ErrorRow[]>([]);
  const [resumen, setResumen] = useState<{ ultimoDia: number; usuariosAfectados: number } | null>(null);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'sinAcceso' | 'error'>('cargando');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [ultimaLectura, setUltimaLectura] = useState<Date | null>(null);

  const cargar = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace('/login'); return; }

    const res = await fetch('/api/admin/errores', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.status === 404 || res.status === 401) { setEstado('sinAcceso'); return; }
    if (!res.ok) { setEstado('error'); return; }

    const data = await res.json();
    setErrores(data.errores ?? []);
    setResumen(data.resumen ?? null);
    setUltimaLectura(new Date());
    setEstado('ok');
  }, [router]);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, REFRESCO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  if (estado === 'cargando') return <p style={{ padding: 40, fontFamily: 'system-ui' }}>Cargando…</p>;
  if (estado === 'sinAcceso') return <p style={{ padding: 40, fontFamily: 'system-ui' }}>No encontrado.</p>;
  if (estado === 'error') return <p style={{ padding: 40, fontFamily: 'system-ui' }}>No se pudieron leer los errores.</p>;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1000, margin: '0 auto', padding: '32px 20px' }}>
      <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>Errores</h1>
      <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 20px' }}>
        Se actualiza sola cada {REFRESCO_MS / 1000} segundos
        {ultimaLectura ? ` · última lectura ${ultimaLectura.toLocaleTimeString('es-UY')}` : ''}
      </p>

      {resumen && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <Tarjeta
            valor={resumen.ultimoDia}
            etiqueta="en las últimas 24 h"
            alerta={resumen.ultimoDia > 0}
          />
          <Tarjeta
            valor={resumen.usuariosAfectados}
            etiqueta="clientes afectados"
            // Que le pase a más de uno es lo que separa un comprobante raro de un bug.
            alerta={resumen.usuariosAfectados > 1}
          />
        </div>
      )}

      {errores.length === 0 ? (
        <p style={{ color: '#166534', fontSize: 14 }}>Ningún error registrado. </p>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
          {errores.map((e) => (
            <div key={e.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <button
                onClick={() => setAbierto(abierto === e.id ? null : e.id)}
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  padding: '11px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                  display: 'flex', gap: 12, alignItems: 'baseline',
                }}
              >
                <span style={{ color: '#9ca3af', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {new Date(e.ocurrido).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{
                  background: '#f3f4f6', borderRadius: 5, padding: '1px 7px',
                  fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                  {e.ambito}
                </span>
                <span style={{ color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.mensaje}
                </span>
              </button>
              {abierto === e.id && (
                <div style={{ padding: '0 14px 14px', fontSize: 12, color: '#374151' }}>
                  {e.user_id && <div style={{ marginBottom: 6 }}>Cliente: <code>{e.user_id}</code></div>}
                  {e.contexto && (
                    <pre style={{ background: '#f9fafb', padding: 10, borderRadius: 6, overflowX: 'auto', margin: '0 0 8px' }}>
                      {JSON.stringify(e.contexto, null, 2)}
                    </pre>
                  )}
                  {e.stack && (
                    <pre style={{ background: '#f9fafb', padding: 10, borderRadius: 6, overflowX: 'auto', margin: 0, color: '#6b7280' }}>
                      {e.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tarjeta({ valor, etiqueta, alerta }: { valor: number; etiqueta: string; alerta: boolean }) {
  return (
    <div style={{
      border: `1px solid ${alerta ? '#fde68a' : '#e5e7eb'}`,
      background: alerta ? '#fffbeb' : '#fff',
      borderRadius: 10, padding: '12px 18px', minWidth: 140,
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: alerta ? '#92400e' : '#111827' }}>{valor}</div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{etiqueta}</div>
    </div>
  );
}
