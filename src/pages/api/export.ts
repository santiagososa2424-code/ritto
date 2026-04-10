import type { NextApiRequest, NextApiResponse } from 'next';
import { generateSystemExcel } from '../../lib/excelExporter';
import type { ExtractedInvoice, SistemaContable } from '../../lib/types';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { invoices, sistema } = req.body as { invoices: ExtractedInvoice[]; sistema?: SistemaContable };
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return res.status(400).json({ error: 'No hay facturas para exportar' });
  }

  const sys: SistemaContable = sistema ?? 'gns';
  const buffer = generateSystemExcel(invoices, sys);
  const date = new Date().toISOString().slice(0, 10);
  const sysLabel = sys === 'zeta' ? 'ZetaSoftware' : sys === 'siigo' ? 'Siigo' : 'GNS';

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="ritto-${sysLabel}-${date}.xlsx"`);
  res.send(buffer);
}
