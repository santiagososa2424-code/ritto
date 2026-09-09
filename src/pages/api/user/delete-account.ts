import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../lib/auth';

// Borrado definitivo de la cuenta. La política de privacidad promete eliminación a
// pedido y hasta ahora era un trámite manual por mail: esto lo vuelve un botón.
//
// El orden importa. Primero se revoca en Google, porque una vez borrado el perfil ya
// no hay refresh token con qué hacerlo y el permiso quedaría vivo para siempre del
// lado del usuario. Recién después se borran los datos.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  // Confirmación explícita: sin esto, un CSRF o un clic accidental borra una cuenta
  // entera sin vuelta atrás.
  if (req.body?.confirm !== 'ELIMINAR') {
    return res.status(400).json({ error: 'Falta la confirmación' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const steps: Record<string, string> = {};

  // 1. Revocar en Google antes de perder el token.
  const { data: profile } = await supabase
    .from('profiles')
    .select('google_refresh_token, google_access_token')
    .eq('id', user.id)
    .single();

  const googleToken = (profile?.google_refresh_token ?? profile?.google_access_token) as string | undefined;
  if (googleToken) {
    try {
      const r = await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: googleToken }),
      });
      steps.google = r.ok || r.status === 400 ? 'revocado' : `respondio_${r.status}`;
    } catch {
      steps.google = 'error';
    }
  } else {
    steps.google = 'sin_conexion';
  }

  // 2. Borrar lo que cuelga del usuario. Se hace explícito y no por cascada porque
  // sólo `profiles` declara la FK contra auth.users; el resto quedaría huérfano.
  const { error: invErr } = await supabase.from('invoices').delete().eq('user_id', user.id);
  steps.facturas = invErr ? `error: ${invErr.message}` : 'borradas';

  const { error: memErr } = await supabase.from('organization_members').delete().eq('user_id', user.id);
  steps.equipo = memErr ? `error: ${memErr.message}` : 'borrado';

  if (user.email) {
    // Las invitaciones se guardan por mail, no por id: sin esto, quien se borra y
    // vuelve a registrarse cae de nuevo en la organización de la que se fue.
    await supabase.from('org_invites').delete().eq('email', user.email.toLowerCase());
    steps.invitaciones = 'borradas';
  }

  const { error: profErr } = await supabase.from('profiles').delete().eq('id', user.id);
  steps.perfil = profErr ? `error: ${profErr.message}` : 'borrado';

  // 3. Recién al final el usuario de auth: mientras exista, su token sigue siendo
  // válido y podría volver a entrar a mitad del borrado.
  const { error: authErr } = await supabase.auth.admin.deleteUser(user.id);
  if (authErr) {
    console.error('[delete-account] no se pudo borrar el usuario:', authErr.message);
    return res.status(500).json({ error: 'No se pudo completar la baja. Escribinos a santiagososa2424@gmail.com', steps });
  }
  steps.cuenta = 'borrada';

  return res.status(200).json({ ok: true, steps });
}
