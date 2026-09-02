import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../lib/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { data: ownerMember } = await supabaseAdmin
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
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
    .select('id, email, role, status, user_id, invite_token')
    .eq('org_id', ownerMember.org_id)
    .neq('status', 'removed')
    .order('created_at');

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ritto.lat';
  const membersOut = (members ?? []).map((m) => ({
    id: m.id,
    email: m.email,
    role: m.role,
    status: m.status,
    user_id: m.user_id,
    invite_url: m.status === 'pending' && m.invite_token ? `${siteUrl}/join?token=${m.invite_token}` : null,
    profile: m.user_id ? profiles[m.user_id] : null,
  }));

  return res.status(200).json({ org, members: membersOut });
}
