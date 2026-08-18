import type { NextApiRequest, NextApiResponse } from 'next';
import { generateCustomExcel } from '../../lib/excelExporter';
import { DEFAULT_COLUMNS } from '../../lib/types';
import type { ExtractedInvoice, ExcelColumn } from '../../lib/types';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { invoices, mapping } = req.body as { invoices: ExtractedInvoice[]; mapping?: ExcelColumn[] };
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return res.status(400).json({ error: 'No hay facturas para exportar' });
  }

  const columns = mapping && mapping.length > 0 ? mapping : DEFAULT_COLUMNS;
  const buffer = generateCustomExcel(invoices, columns);
  const date = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="ritto-${date}.xlsx"`);
  res.send(buffer);
}
