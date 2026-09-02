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

  if (!ownerMember) return res.status(403).json({ error: 'Solo el dueño puede ver este panel' });

  const { data: members } = await supabaseAdmin
    .from('organization_members')
    .select('id, email, role, user_id')
    .eq('org_id', ownerMember.org_id)
    .eq('status', 'active')
    .order('created_at');

  const activeMembers = (members ?? []).filter((m) => m.user_id);
  const userIds = activeMembers.map((m) => m.user_id as string);

  let profiles: Record<string, { nombre?: string; empresa?: string }> = {};
  if (userIds.length > 0) {
    const { data: profileRows } = await supabaseAdmin
      .from('profiles')
      .select('id, nombre, empresa')
      .in('id', userIds);
    for (const p of profileRows ?? []) {
      profiles[p.id] = { nombre: p.nombre, empresa: p.empresa };
    }
  }

  let invoicesByUser: Record<string, { count: number; total: number; lastDate: string | null }> = {};
  if (userIds.length > 0) {
    const { data: invoiceRows } = await supabaseAdmin
      .from('invoices')
      .select('user_id, total, fecha')
      .in('user_id', userIds);
    for (const inv of invoiceRows ?? []) {
      if (!invoicesByUser[inv.user_id]) {
        invoicesByUser[inv.user_id] = { count: 0, total: 0, lastDate: null };
      }
      invoicesByUser[inv.user_id].count++;
      invoicesByUser[inv.user_id].total += inv.total ?? 0;
      if (inv.fecha && (!invoicesByUser[inv.user_id].lastDate || inv.fecha > invoicesByUser[inv.user_id].lastDate)) {
        invoicesByUser[inv.user_id].lastDate = inv.fecha;
      }
    }
  }

  const panel = activeMembers.map((m) => {
    const profile = profiles[m.user_id] ?? {};
    const stats = invoicesByUser[m.user_id] ?? { count: 0, total: 0, lastDate: null };
    return {
      memberId: m.id,
      userId: m.user_id,
      email: m.email,
      name: profile.nombre ?? profile.empresa ?? m.email,
      role: m.role,
      invoiceCount: stats.count,
      invoiceTotal: stats.total,
      lastInvoiceDate: stats.lastDate,
    };
  });

  return res.status(200).json({ panel });
}
