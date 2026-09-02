import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../lib/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FIELD_MAP: Record<string, string> = {
  proveedor: 'proveedor',
  rut: 'rut',
  fecha: 'fecha',
  nroDocumento: 'nro_documento',
  tipoDocumento: 'tipo_documento',
  moneda: 'moneda',
  neto: 'neto',
  iva10: 'iva10',
  iva22: 'iva22',
  ivaTotal: 'iva_total',
  total: 'total',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { invoiceId, updates } = req.body as {
    invoiceId: string;
    updates: Record<string, unknown>;
  };

  if (!invoiceId || !updates) {
    return res.status(400).json({ error: 'invoiceId y updates son requeridos' });
  }

  const dbUpdates: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(updates)) {
    const col = FIELD_MAP[key];
    if (!col) continue;
    const isNumeric = ['neto', 'iva10', 'iva22', 'ivaTotal', 'total'].includes(key);
    dbUpdates[col] = isNumeric
      ? (val === '' || val == null ? null : Number(val))
      : (val === '' ? null : val);
  }

  if (Object.keys(dbUpdates).length === 0) {
    return res.status(400).json({ error: 'Sin campos válidos para actualizar' });
  }

  const { error } = await supabaseAdmin
    .from('invoices')
    .update(dbUpdates)
    .eq('id', invoiceId)
    .eq('user_id', user.id);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
