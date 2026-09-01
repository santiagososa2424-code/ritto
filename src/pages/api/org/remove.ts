import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, memberId } = req.body as { userId: string; memberId: string };
  if (!userId || !memberId) return res.status(400).json({ error: 'userId y memberId requeridos' });

  const { data: ownerMember } = await supabaseAdmin
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .maybeSingle();

  if (!ownerMember) return res.status(403).json({ error: 'No sos el dueño de ninguna organización' });

  const { data: target } = await supabaseAdmin
    .from('organization_members')
    .select('id, user_id, role')
    .eq('id', memberId)
    .eq('org_id', ownerMember.org_id)
    .maybeSingle();

  if (!target) return res.status(404).json({ error: 'Miembro no encontrado' });
  if (target.role === 'owner') return res.status(400).json({ error: 'No podés remover al dueño' });

  await supabaseAdmin
    .from('organization_members')
    .update({ status: 'removed', user_id: null, invite_token: null })
    .eq('id', memberId);

  if (target.user_id) {
    await supabaseAdmin
      .from('profiles')
      .update({ org_id: null, subscription_status: 'blocked' })
      .eq('id', target.user_id);
  }

  return res.status(200).json({ ok: true });
}
