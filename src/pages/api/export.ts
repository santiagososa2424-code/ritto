import type { NextApiRequest, NextApiResponse } from 'next';
import { generateExcel } from '../../lib/excelExporter';
import type { ExtractedInvoice } from '../../lib/types';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { invoices } = req.body as { invoices: ExtractedInvoice[] };
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return res.status(400).json({ error: 'No hay facturas para exportar' });
  }

  const buffer = generateExcel(invoices);
  const date = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="ritto-facturas-${date}.xlsx"`);
  res.send(buffer);
}
