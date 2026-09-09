import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../../lib/auth';

// Desconectar tiene que revocar el permiso en Google, no sólo borrar los tokens de
// nuestra base: si sólo los borramos, el usuario cree que cortó el acceso pero el
// consentimiento sigue vivo del lado de Google.
//
// Va en el servidor porque revocar necesita el refresh token, y el navegador no debe
// tenerlo nunca.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_refresh_token, google_access_token')
    .eq('id', user.id)
    .single();

  // Se revoca el refresh token: eso invalida de una toda la concesión, incluidos los
  // access tokens que hayan salido de él.
  const token = (profile?.google_refresh_token ?? profile?.google_access_token) as string | undefined;
  let revoked = false;
  if (token) {
    try {
      const r = await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }),
      });
      // 400 es lo que responde Google si ya estaba revocado o vencido: para nosotros
      // el resultado es el mismo.
      revoked = r.ok || r.status === 400;
    } catch (e) {
      console.error('[google disconnect] revoke falló:', e);
    }
  }

  // Los tokens se borran igual, aunque revocar haya fallado: no queremos seguir
  // guardando credenciales que el usuario pidió eliminar.
  const { error } = await supabase
    .from('profiles')
    .update({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expires_at: null,
      google_email: null,
    })
    .eq('id', user.id);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true, revoked });
}
