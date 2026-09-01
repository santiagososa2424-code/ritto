import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { token, userId } = req.body as { token: string; userId: string };
  if (!token || !userId) return res.status(400).json({ error: 'token y userId requeridos' });

  const { data: invite } = await supabaseAdmin
    .from('organization_members')
    .select('id, org_id, status')
    .eq('invite_token', token)
    .maybeSingle();

  if (!invite) return res.status(404).json({ error: 'Invitación inválida o ya utilizada' });
  if (invite.status === 'active') return res.status(400).json({ error: 'Esta invitación ya fue aceptada' });
  if (invite.status === 'removed') return res.status(400).json({ error: 'Invitación cancelada' });

  // Check user isn't already in another org
  const { data: existingMembership } = await supabaseAdmin
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
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
    .update({ user_id: userId, status: 'active', invite_token: null })
    .eq('id', invite.id);

  await supabaseAdmin
    .from('profiles')
    .update({
      org_id: invite.org_id,
      subscription_status: 'active',
      plan: org?.plan ?? 'pyme',
    })
    .eq('id', userId);

  return res.status(200).json({ ok: true });
}
