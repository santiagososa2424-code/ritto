import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../lib/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { token } = req.body as { token: string };
  if (!token) return res.status(400).json({ error: 'token requerido' });

  const { data: invite } = await supabaseAdmin
    .from('organization_members')
    .select('id, org_id, status, email')
    .eq('invite_token', token)
    .maybeSingle();

  if (!invite) return res.status(404).json({ error: 'Invitación inválida o ya utilizada' });
  if (invite.status === 'active') return res.status(400).json({ error: 'Esta invitación ya fue aceptada' });
  if (invite.status === 'removed') return res.status(400).json({ error: 'Invitación cancelada' });

  if (invite.email && user.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return res.status(403).json({ error: 'Esta invitación es para otro email' });
  }

  const { data: existingMembership } = await supabaseAdmin
    .from('organization_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (existingMembership) return res.status(400).json({ error: 'Ya pertenecés a una organización' });

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('plan')
    .eq('id', invite.org_id)
    .single();

  await supabaseAdmin
    .from('organization_members')
    .update({ user_id: user.id, status: 'active', invite_token: null })
    .eq('id', invite.id);

  await supabaseAdmin
    .from('profiles')
    .update({
      org_id: invite.org_id,
      subscription_status: 'active',
      plan: org?.plan ?? 'pyme',
      onboarding_complete: true,
    })
    .eq('id', user.id);

  return res.status(200).json({ ok: true });
}
