import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { token } = req.query as { token: string };
  if (!token) return res.status(400).json({ error: 'token requerido' });

  const { data: member } = await supabaseAdmin
    .from('organization_members')
    .select('status, email, org_id')
    .eq('invite_token', token)
    .maybeSingle();

  if (!member) return res.status(404).json({ error: 'Invitación inválida o ya utilizada' });
  if (member.status === 'active') return res.status(400).json({ error: 'Esta invitación ya fue aceptada' });
  if (member.status === 'removed') return res.status(400).json({ error: 'Invitación cancelada' });

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('name, plan')
    .eq('id', member.org_id)
    .single();

  return res.status(200).json({
    orgName: org?.name ?? 'una organización',
    plan: org?.plan ?? 'pyme',
    email: member.email,
  });
}
