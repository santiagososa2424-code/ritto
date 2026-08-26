import type { NextApiRequest, NextApiResponse } from 'next';

const PLAN_ITEMS: Record<string, { title: string; unit_price: number }> = {
  pro: { title: 'Ritto Pro · 1 empresa', unit_price: 1500 },
  pyme: { title: 'Ritto Pyme · 5 cuentas', unit_price: 5000 },
  empresa: { title: 'Ritto Empresa · 20 cuentas', unit_price: 12000 },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { plan, email } = req.body as { plan: string; email: string };
  const item = PLAN_ITEMS[plan];
  if (!item) return res.status(400).json({ error: 'Plan inválido' });

  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) return res.status(503).json({ error: 'Pagos no configurados' });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ritto.lat';

  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      items: [{ ...item, quantity: 1, currency_id: 'ARS' }],
      payer: { email },
      back_urls: {
        success: `${siteUrl}/plan?payment=success`,
        failure: `${siteUrl}/plan?payment=failure`,
        pending: `${siteUrl}/plan?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: `${plan}|${email}`,
    }),
  });

  if (!mpRes.ok) {
    const detail = await mpRes.text();
    return res.status(500).json({ error: 'Error MercadoPago', detail });
  }

  const data = await mpRes.json();
  return res.status(200).json({ checkout_url: data.init_point });
}
