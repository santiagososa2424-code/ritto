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
  const rut = digits.length > 9 ? digits.slice(-9) : digits.padStart(9, '0');
  return `${rut.slice(0, 2)}.${rut.slice(2, 5)}.${rut.slice(5, 8)}-${rut.slice(8)}`;
}

type DeepRecord = Record<string, unknown>;

function getObj(val: unknown): DeepRecord | undefined {
  if (val != null && typeof val === 'object' && !Array.isArray(val))
    return val as DeepRecord;
  return undefined;
}

export function parseCFE(xmlContent: string): Partial<ExtractedInvoice> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: true,
    parseAttributeValue: true,
  });

  const doc = parser.parse(xmlContent) as DeepRecord;

  const root = getObj(
    doc['CFE'] ?? doc['eCFE'] ?? doc['FCFE'] ?? Object.values(doc)[0]
  );
  if (!root) return {};

  const enc = getObj(root['Encabezado'] ?? root['encabezado']);
  if (!enc) return {};

  const idDoc = getObj(enc['IdDoc'] ?? enc['idDoc']);
  const emisor = getObj(enc['Emisor'] ?? enc['emisor']);
  const totales = getObj(enc['Totales'] ?? enc['totales']);

  const tipoCFE = String(idDoc?.['TipoCFE'] ?? idDoc?.['tipoCFE'] ?? '');
  const nro = String(idDoc?.['Nro'] ?? idDoc?.['nro'] ?? '');
  const serie = String(idDoc?.['Serie'] ?? idDoc?.['serie'] ?? '');
  const fecha = String(idDoc?.['FchEmis'] ?? idDoc?.['fchEmis'] ?? '');

  const rucRaw = emisor?.['RUCEmisor'] ?? emisor?.['RucEmisor'] ?? emisor?.['rucEmisor'];
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
    rut: rucRaw != null ? formatRUT(String(rucRaw)) : undefined,
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
