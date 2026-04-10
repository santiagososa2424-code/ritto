import { XMLParser } from 'fast-xml-parser';
import type { ExtractedInvoice } from './types';

const TIPO_CFE: Record<string, string> = {
  '101': 'e-Factura',
  '102': 'e-Factura Exportación',
  '111': 'e-Boleta Honorarios',
  '181': 'e-Remito',
  '182': 'e-Remito Exportación',
  '201': 'e-Ticket',
  '211': 'e-Boleta Honorarios Profesionales',
  '301': 'e-Factura Crédito Exportación',
};

function formatRUT(raw: string | number): string {
  const digits = String(raw).replace(/\D/g, '');
  // RUCEmisor en CFE tiene 12 dígitos (país + RUT). Tomamos los últimos 9.
  const rut = digits.length > 9 ? digits.slice(-9) : digits.padStart(9, '0');
  return `${rut.slice(0, 2)}.${rut.slice(2, 5)}.${rut.slice(5, 8)}-${rut.slice(8)}`;
}

function getDeep(obj: Record<string, unknown>, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

export function parseCFE(xmlContent: string): Partial<ExtractedInvoice> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: true,
    parseAttributeValue: true,
  });

  const doc = parser.parse(xmlContent) as Record<string, unknown>;

  // El root puede ser <CFE>, <eCFE>, <FCFE> según versión DGI
  const root =
    (doc['CFE'] ?? doc['eCFE'] ?? doc['FCFE'] ?? Object.values(doc)[0]) as Record<string, unknown>;

  const enc = (root?.['Encabezado'] ?? root?.['encabezado']) as Record<string, unknown> | undefined;
  if (!enc) return {};

  const idDoc = (enc['IdDoc'] ?? enc['idDoc']) as Record<string, unknown> | undefined;
  const emisor = (enc['Emisor'] ?? enc['emisor']) as Record<string, unknown> | undefined;
  const totales = (enc['Totales'] ?? enc['totales']) as Record<string, unknown> | undefined;

  const tipoCFE = String(idDoc?.['TipoCFE'] ?? idDoc?.['tipoCFE'] ?? '');
  const nro = String(idDoc?.['Nro'] ?? idDoc?.['nro'] ?? '');
  const serie = String(idDoc?.['Serie'] ?? idDoc?.['serie'] ?? '');
  const fecha = String(idDoc?.['FchEmis'] ?? idDoc?.['fchEmis'] ?? '');

  const rucRaw = emisor?.['RUCEmisor'] ?? emisor?.['RucEmisor'] ?? emisor?.['rucEmisor'] ?? '';
  const rznSoc = String(emisor?.['RznSoc'] ?? emisor?.['rznSoc'] ?? '');

  const neto = Number(totales?.['MntNeto'] ?? totales?.['mntNeto'] ?? 0) || undefined;
  const iva10 = Number(totales?.['MntIVATasa10'] ?? totales?.['mntIVATasa10'] ?? 0) || undefined;
  const iva22 = Number(totales?.['MntIVATasa22'] ?? totales?.['mntIVATasa22'] ?? 0) || undefined;
  const ivaTotal =
    Number(totales?.['MntIVA'] ?? totales?.['mntIVA'] ?? 0) ||
    ((iva10 ?? 0) + (iva22 ?? 0)) || undefined;
  const total = Number(totales?.['MntTotal'] ?? totales?.['mntTotal'] ?? 0) || undefined;
  const moneda = String(
    totales?.['TpoMoneda'] ?? totales?.['tpoMoneda'] ?? idDoc?.['TipoMoneda'] ?? 'UYU'
  );

  return {
    proveedor: rznSoc || undefined,
    rut: rucRaw ? formatRUT(String(rucRaw)) : undefined,
    fecha: fecha || undefined,
    nroDocumento: serie ? `${serie}-${nro}` : nro || undefined,
    tipoDocumento: TIPO_CFE[tipoCFE] ?? `Tipo ${tipoCFE}`,
    moneda,
    neto,
    iva10,
    iva22,
    ivaTotal,
    total,
  };
}
