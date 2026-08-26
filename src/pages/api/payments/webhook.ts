import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

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
      }
    }
  } catch {
    // always 200 so MP doesn't retry endlessly
  }

  return res.status(200).end();
}
