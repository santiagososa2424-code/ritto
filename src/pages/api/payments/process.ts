import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { formData, userId, plan } = req.body as {
    formData: Record<string, unknown>;
    userId: string;
    plan: string;
  };

  if (!formData || !userId || !plan) {
    return res.status(400).json({ error: 'Parámetros inválidos' });
  }

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return res.status(503).json({ error: 'Pagos no configurados' });

  const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ...formData,
      external_reference: `${plan}|${userId}`,
    }),
  });

  if (!mpRes.ok) {
    const detail = await mpRes.text();
    console.error('MP process error:', detail);
    return res.status(500).json({ error: 'Error al procesar el pago', detail });
  }

  const payment = await mpRes.json();

  if (payment.status === 'approved' || payment.status === 'in_process') {
    await supabaseAdmin
      .from('profiles')
      .update({ plan, subscription_status: 'active' })
      .eq('id', userId);
  }

  return res.status(200).json({ status: payment.status, id: payment.id });
}
