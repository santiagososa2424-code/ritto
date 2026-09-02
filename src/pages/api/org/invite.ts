import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { getAuthUser } from '../../../lib/auth';

const PLAN_SEATS: Record<string, number> = { pyme: 5, empresa: 20 };

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { email } = req.body as { email: string };
  if (!email) return res.status(400).json({ error: 'email requerido' });

  const normalizedEmail = email.toLowerCase().trim().slice(0, 254);

  const { data: ownerMember } = await supabaseAdmin
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle();

  if (!ownerMember) return res.status(403).json({ error: 'No sos el dueño de ninguna organización' });

  const orgId = ownerMember.org_id;

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .single();

  const maxSeats = PLAN_SEATS[org?.plan ?? ''] ?? 5;

  const { count } = await supabaseAdmin
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .neq('status', 'removed');

  if ((count ?? 0) >= maxSeats) {
    return res.status(400).json({ error: `Tu plan ${org?.plan} tiene un máximo de ${maxSeats} cuentas` });
  }

  const { data: existing } = await supabaseAdmin
    .from('organization_members')
    .select('id')
    .eq('org_id', orgId)
    .eq('email', normalizedEmail)
    .neq('status', 'removed')
    .maybeSingle();

  if (existing) return res.status(400).json({ error: 'Ese email ya fue invitado' });

  const token = randomUUID();
  await supabaseAdmin.from('organization_members').insert({
    org_id: orgId,
    email: normalizedEmail,
    role: 'member',
    status: 'pending',
    invite_token: token,
    sucursal_name: '',
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ritto.lat';
  return res.status(200).json({ invite_url: `${siteUrl}/join?token=${token}` });
}
