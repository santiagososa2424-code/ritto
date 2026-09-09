import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../lib/auth';

const PLANES = ['pro', 'pyme', 'empresa'] as const;
const TRIAL_DIAS = 14;

// Crea el perfil al registrarse. Antes lo escribía el navegador, incluidas las columnas
// que deciden si la cuenta está paga: plan, subscription_status y trial_ends_at. Con la
// sesión propia y una línea en la consola, cualquiera se ponía subscription_status en
// 'active' y usaba el producto sin pagar.
//
// Acá esas columnas las fija el servidor y el cliente sólo propone el plan, que además
// se valida contra la lista. Es lo que permite después quitarle al rol `authenticated`
// el permiso de escribirlas.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const body = req.body as { nombre?: string; empresa?: string; rut?: string; telefono?: string; plan?: string };
  const plan = PLANES.includes(body.plan as (typeof PLANES)[number]) ? body.plan : 'pyme';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Idempotente a propósito: si ya hay un trial corriendo no se reinicia. Si no,
  // reintentar el alta —o volver a pasar por el onboarding— renovaría la prueba
  // gratis para siempre.
  const { data: existing } = await supabase
    .from('profiles')
    .select('trial_ends_at, subscription_status')
    .eq('id', user.id)
    .maybeSingle();

  const trial = existing?.trial_ends_at
    ? {}
    : {
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + TRIAL_DIAS * 24 * 60 * 60 * 1000).toISOString(),
      };

  // La invitación se busca por el mail de la sesión, no por uno que mande el cliente:
  // si no, alguien podría meterse en la organización de otro.
  const { data: invite } = await supabase
    .from('org_invites')
    .select('id, organization_id')
    .eq('email', (user.email ?? '').toLowerCase())
    .eq('status', 'pending')
    .maybeSingle();

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    nombre: body.nombre ?? null,
    empresa: body.empresa ?? null,
    rut: body.rut || null,
    telefono: body.telefono || null,
    plan,
    onboarding_complete: false,
    ...trial,
    ...(invite ? { organization_id: invite.organization_id, role: 'member' } : {}),
  });

  if (error) {
    console.error('[bootstrap] error creando perfil:', error.message);
    return res.status(500).json({ error: 'No se pudo crear el perfil' });
  }

  if (invite) {
    await supabase.from('org_invites').update({ status: 'accepted' }).eq('id', invite.id);
  }

  return res.status(200).json({ ok: true, plan, joinedOrg: Boolean(invite) });
}
