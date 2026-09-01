import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { userId } = req.query as { userId: string };
  if (!userId) return res.status(400).json({ error: 'userId requerido' });

  const { data: ownerMember } = await supabaseAdmin
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .maybeSingle();

  if (!ownerMember) return res.status(403).json({ error: 'No sos el dueño de ninguna organización' });

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id, name, plan')
    .eq('id', ownerMember.org_id)
    .single();

  const { data: members } = await supabaseAdmin
    .from('organization_members')
    .select('id, email, role, status, invite_token, user_id')
    .eq('org_id', ownerMember.org_id)
    .neq('status', 'removed')
    .order('created_at');

  // Get profiles for active members
  const activeUserIds = (members ?? [])
    .filter((m) => m.user_id && m.status === 'active')
    .map((m) => m.user_id);

  let profiles: Record<string, { nombre?: string; empresa?: string }> = {};
  if (activeUserIds.length > 0) {
    const { data: profileRows } = await supabaseAdmin
      .from('profiles')
      .select('id, nombre, empresa')
      .in('id', activeUserIds);
    for (const p of profileRows ?? []) {
      profiles[p.id] = { nombre: p.nombre, empresa: p.empresa };
    }
  }

  const membersWithProfiles = (members ?? []).map((m) => ({
    ...m,
    profile: m.user_id ? profiles[m.user_id] : null,
  }));

  return res.status(200).json({ org, members: membersWithProfiles });
}
