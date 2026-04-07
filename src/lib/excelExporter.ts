import * as XLSX from 'xlsx';
import type { ExtractedInvoice } from './types';

export function generateExcel(invoices: ExtractedInvoice[]): Buffer {
  const done = invoices.filter((i) => i.status === 'done');

  const headers = [
    'Proveedor',
    'RUT',
    'Fecha',
    'Documento',
    'Tipo',
    'Moneda',
    'Neto',
    'IVA 10%',
    'IVA 22%',
    'IVA Total',
    'Total',
    'Fuente',
  ];

  const rows = done.map((inv) => [
    inv.proveedor ?? '',
    inv.rut ?? '',
    inv.fecha ?? '',
    inv.nroDocumento ?? '',
    inv.tipoDocumento ?? '',
    inv.moneda ?? 'UYU',
    inv.neto ?? '',
    inv.iva10 ?? '',
    inv.iva22 ?? '',
    inv.ivaTotal ?? '',
    inv.total ?? '',
    inv.source === 'cfe_xml' ? 'CFE Digital' : inv.source === 'pdf' ? 'PDF' : 'Imagen',
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Column widths
  ws['!cols'] = [
    { wch: 30 }, // Proveedor
    { wch: 16 }, // RUT
    { wch: 12 }, // Fecha
    { wch: 14 }, // Documento
    { wch: 16 }, // Tipo
    { wch: 8 },  // Moneda
    { wch: 12 }, // Neto
    { wch: 10 }, // IVA 10%
    { wch: 10 }, // IVA 22%
    { wch: 10 }, // IVA Total
    { wch: 12 }, // Total
    { wch: 12 }, // Fuente
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
