import type { NextApiRequest, NextApiResponse } from 'next';

// TEST — revert to 1500/5000/12000 before going live
const PLAN_ITEMS: Record<string, { title: string; unit_price: number }> = {
  pro: { title: 'Ritto Pro · 1 empresa', unit_price: 100 },
  pyme: { title: 'Ritto Pyme · 5 cuentas', unit_price: 100 },
  empresa: { title: 'Ritto Empresa · 20 cuentas', unit_price: 100 },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { plan, email, userId } = req.body as { plan: string; email: string; userId: string };
  const item = PLAN_ITEMS[plan];
  if (!item || !email || !userId) return res.status(400).json({ error: 'Parámetros inválidos' });

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return res.status(503).json({ error: 'Pagos no configurados en el servidor. Contactá soporte@ritto.lat' });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ritto.lat';

  // Using Checkout Pro (preference) instead of preapproval to avoid debit card CVV tokenization bug
  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      items: [
        {
          title: item.title,
          quantity: 1,
          unit_price: item.unit_price,
          currency_id: 'UYU',
        },
      ],
      payer: { email },
      external_reference: `${plan}|${userId}`,
      back_urls: {
        success: `${siteUrl}/plan?subscribed=1`,
        failure: `${siteUrl}/plan?payment_failed=1`,
        pending: `${siteUrl}/plan?subscribed=1`,
      },
      auto_return: 'approved',
      notification_url: `${siteUrl}/api/payments/webhook`,
    }),
  });

  if (!mpRes.ok) {
    const detail = await mpRes.text();
    console.error('MercadoPago error:', detail);
    return res.status(500).json({ error: 'Error al crear el pago con MercadoPago.', detail });
  }

  const data = await mpRes.json();
  return res.status(200).json({ checkout_url: data.init_point });
}
