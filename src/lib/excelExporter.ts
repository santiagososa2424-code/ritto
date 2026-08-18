import * as XLSX from 'xlsx';
import type { ExtractedInvoice } from './types';
import { DEFAULT_COLUMNS } from './types';
import type { ExcelColumn } from './types';

function makeSheet(headers: string[], rows: (string | number)[][], colWidths: number[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = colWidths.map((wch) => ({ wch }));
  return ws;
}

function getFieldValue(inv: ExtractedInvoice, field: string): string | number {
  const v = (inv as unknown as Record<string, unknown>)[field];
  if (v == null) return '';
  if (typeof v === 'number') return v;
  return String(v);
}

export function generateCustomExcel(invoices: ExtractedInvoice[], columns: ExcelColumn[]): Buffer {
  const headers = columns.map((c) => c.label);
  const rows: (string | number)[][] = [];
  for (const inv of invoices.filter((i) => i.status === 'done')) {
    rows.push(columns.map((col) => getFieldValue(inv, col.field)));
  }
  const colWidths = columns.map((c) => Math.max(c.label.length + 2, 14));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(headers, rows, colWidths), 'Facturas');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export function generateExcel(invoices: ExtractedInvoice[]): Buffer {
  return generateCustomExcel(invoices, DEFAULT_COLUMNS);
}

export { DEFAULT_COLUMNS };
