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

  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('org_id, role, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) return res.status(404).json({ error: 'No sos miembro de ninguna organización' });

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id, name, plan')
    .eq('id', membership.org_id)
    .single();

  const { data: members } = await supabaseAdmin
    .from('organization_members')
    .select('id, role, status, user_id')
    .eq('org_id', membership.org_id)
    .eq('status', 'active')
    .order('created_at');

  const memberUserIds = (members ?? []).filter((m) => m.user_id).map((m) => m.user_id);
  let profiles: Record<string, { nombre?: string; empresa?: string }> = {};
  if (memberUserIds.length > 0) {
    const { data: profileRows } = await supabaseAdmin
      .from('profiles')
      .select('id, nombre, empresa')
      .in('id', memberUserIds);
    for (const p of profileRows ?? []) {
      profiles[p.id] = { nombre: p.nombre, empresa: p.empresa };
    }
  }

  const membersOut = (members ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    status: m.status,
    name: m.user_id ? (profiles[m.user_id]?.nombre || profiles[m.user_id]?.empresa || null) : null,
  }));

  return res.status(200).json({ org, members: membersOut, myRole: membership.role });
}
