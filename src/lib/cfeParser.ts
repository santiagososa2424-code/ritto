import { XMLParser } from 'fast-xml-parser';
import type { ExtractedInvoice, InvoiceItem } from './types';

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

export function parseCFE(xmlContent: string): Partial<ExtractedInvoice> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: true,
    parseAttributeValue: true,
  });

  const doc = parser.parse(xmlContent) as Record<string, unknown>;

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

  // Extraer líneas de detalle
  const detalle = root?.['Detalle'] ?? root?.['detalle'];
  const items: InvoiceItem[] = [];
  if (detalle) {
    const raw = (detalle as Record<string, unknown>)['Item'] ?? (detalle as Record<string, unknown>)['item'];
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const it of arr as Record<string, unknown>[]) {
      const codIVA = Number(it['CodIVA'] ?? it['codIVA'] ?? 0);
      const impuesto = codIVA === 1 ? 22 : codIVA === 2 ? 10 : 0;
      const cantidad = Number(it['Cantidad'] ?? it['cantidad'] ?? 1);
      const precioUnitario = Number(it['PrecioUnitario'] ?? it['precioUnitario'] ?? 0);
      const descPct = Number(it['DescuentoPct'] ?? it['descuentoPct'] ?? 0);
      const subtotal = Number(it['MntBruto'] ?? it['mntBruto'] ?? cantidad * precioUnitario * (1 - descPct / 100));
      const totalItem = Number(it['MontoItem'] ?? it['montoItem'] ?? subtotal * (1 + impuesto / 100));
      items.push({
        codigo: String(it['CodItem'] ?? it['codItem'] ?? ''),
        descripcion: String(it['NomItem'] ?? it['nomItem'] ?? ''),
        cantidad,
        precioUnitario,
        descuento: descPct,
        impuesto,
        subtotal,
        totalItem,
      });
    }
  }

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
    items: items.length > 0 ? items : undefined,
  };
}
