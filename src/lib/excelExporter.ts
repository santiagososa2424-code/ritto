import * as XLSX from 'xlsx';
import type { ExtractedInvoice, InvoiceItem, SistemaContable } from './types';

function toYYYYMMDD(fecha: string): string {
  if (!fecha) return '';
  return fecha.replace(/-/g, '').slice(0, 8);
}

function toDDMMYYYY(fecha: string): string {
  if (!fecha) return '';
  const p = fecha.split('-');
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  return fecha;
}

function getItems(inv: ExtractedInvoice): InvoiceItem[] {
  if (inv.items && inv.items.length > 0) return inv.items;
  return [{
    codigo: '',
    descripcion: inv.tipoDocumento ?? 'Factura',
    cantidad: 1,
    precioUnitario: inv.neto ?? inv.total ?? 0,
    descuento: 0,
    impuesto: inv.ivaTotal && inv.neto && inv.neto > 0
      ? Math.round((inv.ivaTotal / inv.neto) * 100)
      : 22,
    subtotal: inv.neto ?? 0,
    totalItem: inv.total ?? 0,
  }];
}

function makeSheet(headers: string[], rows: (string | number)[][], colWidths: number[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = colWidths.map((wch) => ({ wch }));
  return ws;
}

function generateGNSExcel(invoices: ExtractedInvoice[]): Buffer {
  const headers = [
    'Proveedor', 'Tipo Comprobante', 'Fecha', 'Número',
    'Código', 'Descripción', 'Cantidad', 'Moneda',
    'Precio Unit.', 'Descuento', 'Sub Total', 'Impuestos', 'Total',
  ];
  const rows: (string | number)[][] = [];
  for (const inv of invoices.filter((i) => i.status === 'done')) {
    for (const item of getItems(inv)) {
      const impMonto = (item.subtotal ?? 0) * ((item.impuesto ?? 0) / 100);
      rows.push([
        inv.proveedor ?? '',
        inv.tipoDocumento ?? '',
        inv.fecha ?? '',
        inv.nroDocumento ?? '',
        item.codigo ?? '',
        item.descripcion ?? '',
        item.cantidad ?? 1,
        inv.moneda ?? 'UYU',
        item.precioUnitario ?? 0,
        item.descuento ?? 0,
        item.subtotal ?? 0,
        impMonto,
        item.totalItem ?? 0,
      ]);
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(headers, rows, [28,16,12,14,12,35,10,8,12,10,12,12,12]), 'GNS');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

function generateZetaExcel(invoices: ExtractedInvoice[]): Buffer {
  const headers = [
    'Comprobante', 'Fecha', 'Moneda', 'Cotización', 'Condición Pago',
    'Depósito', 'Centro Costo', 'Referencia', 'Notas',
    'Código Artículo', 'Descripción', 'Cantidad', 'Precio Unitario',
    'Descuento %', 'Impuesto %', 'Total',
  ];
  const rows: (string | number)[][] = [];
  for (const inv of invoices.filter((i) => i.status === 'done')) {
    for (const item of getItems(inv)) {
      rows.push([
        inv.nroDocumento ?? '',
        toYYYYMMDD(inv.fecha ?? ''),
        inv.moneda ?? 'UYU',
        1,
        'Contado',
        '', '', '', '',
        item.codigo ?? '',
        item.descripcion ?? '',
        item.cantidad ?? 1,
        item.precioUnitario ?? 0,
        item.descuento ?? 0,
        item.impuesto ?? 22,
        item.totalItem ?? 0,
      ]);
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(headers, rows, [14,10,8,10,14,10,12,12,16,14,35,10,14,12,12,12]), 'Zeta');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xls' }));
}

function generateSiigoExcel(invoices: ExtractedInvoice[]): Buffer {
  const headers = [
    'Tipo Comprobante', 'Consecutivo', 'Identificación Tercero', 'Sucursal',
    'Centro Costos', 'Fecha Elaboración', 'Moneda', 'Tasa Cambio',
    'Código Producto', 'Descripción', 'Cantidad', 'Precio Unitario',
    'Descuento %', 'IVA %', 'Valor IVA', 'Total',
  ];
  const rows: (string | number)[][] = [];
  for (const inv of invoices.filter((i) => i.status === 'done')) {
    for (const item of getItems(inv)) {
      const valorIVA = (item.subtotal ?? 0) * ((item.impuesto ?? 0) / 100);
      rows.push([
        inv.tipoDocumento ?? '',
        inv.nroDocumento ?? '',
        inv.rut ?? '',
        '', '',
        toDDMMYYYY(inv.fecha ?? ''),
        inv.moneda ?? 'UYU',
        1,
        item.codigo ?? '',
        item.descripcion ?? '',
        item.cantidad ?? 1,
        item.precioUnitario ?? 0,
        item.descuento ?? 0,
        item.impuesto ?? 22,
        valorIVA,
        item.totalItem ?? 0,
      ]);
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, makeSheet(headers, rows, [16,14,16,10,12,16,8,10,14,35,10,14,12,8,12,12]), 'Siigo');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

export function generateExcel(invoices: ExtractedInvoice[]): Buffer {
  return generateGNSExcel(invoices);
}

export function generateSystemExcel(invoices: ExtractedInvoice[], sistema: SistemaContable): Buffer {
  if (sistema === 'zeta') return generateZetaExcel(invoices);
  if (sistema === 'siigo') return generateSiigoExcel(invoices);
  return generateGNSExcel(invoices);
}
