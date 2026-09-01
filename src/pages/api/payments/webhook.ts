import type { NextApiRequest, NextApiResponse } from 'next';
import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifySignature(req: NextApiRequest): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;

  const xSignature = req.headers['x-signature'] as string | undefined;
  const xRequestId = req.headers['x-request-id'] as string | undefined;
  if (!xSignature || !xRequestId) return false;

  const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')));
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  const dataId = (req.body as { data?: { id?: string } })?.data?.id ?? '';
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  return expected === v1;
}

async function createOrgForOwner(userId: string, plan: string) {
  const { data: existingMember } = await supabaseAdmin
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .maybeSingle();

  if (existingMember) return;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('empresa')
    .eq('id', userId)
    .maybeSingle();

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .insert({ owner_id: userId, name: profile?.empresa ?? 'Mi Empresa', plan })
    .select('id')
    .single();

  if (!org) return;

  await supabaseAdmin.from('profiles').update({ org_id: org.id }).eq('id', userId);
  await supabaseAdmin.from('organization_members').insert({
    org_id: org.id,
    user_id: userId,
    role: 'owner',
    status: 'active',
  });
}

export const config = { api: { bodyParser: true } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  if (!verifySignature(req)) return res.status(200).end();

  const { type, data } = req.body as { type: string; data: { id: string } };
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return res.status(200).end();

  try {
    if (type === 'subscription_preapproval') {
      const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${data.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!mpRes.ok) return res.status(200).end();
      const sub = await mpRes.json();
      const ref: string = sub.external_reference ?? '';
      const [plan, userId] = ref.split('|');
      if (!userId) return res.status(200).end();

      if (sub.status === 'authorized' || sub.status === 'pending') {
        await supabaseAdmin.from('profiles').update({
          plan,
          subscription_status: 'active',
          mp_subscription_id: data.id,
        }).eq('id', userId);
        if (plan === 'pyme' || plan === 'empresa') {
          await createOrgForOwner(userId, plan);
        }
      } else if (sub.status === 'cancelled' || sub.status === 'paused') {
        await supabaseAdmin.from('profiles').update({
          subscription_status: 'blocked',
        }).eq('id', userId);
      }
    }

    if (type === 'payment') {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!mpRes.ok) return res.status(200).end();
      const payment = await mpRes.json();
      const ref: string = payment.external_reference ?? '';
      const [plan, userId] = ref.split('|');
      if (!userId) return res.status(200).end();

      if (payment.status === 'approved') {
        await supabaseAdmin.from('profiles').update({
          plan,
          subscription_status: 'active',
        }).eq('id', userId);
        if (plan === 'pyme' || plan === 'empresa') {
          await createOrgForOwner(userId, plan);
        }
      }
    }
  } catch {
    // always 200 so MP doesn't retry endlessly
  }

  return res.status(200).end();
}
