import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import fs from 'fs';
import type { ExtractedInvoice } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const PROMPT = `Sos un sistema de extracción de datos de facturas uruguayas y latinoamericanas.
Extraé todos los datos del documento y respondé ÚNICAMENTE con un JSON válido, sin texto adicional ni bloques de código markdown.

Formato requerido:
{
  "proveedor": "nombre de la empresa emisora",
  "rut": "RUT del emisor en formato XX.XXX.XXX-X",
  "fecha": "fecha de emisión en formato YYYY-MM-DD",
  "nroDocumento": "número de documento completo (ej: A-0001234)",
  "tipoDocumento": "tipo de comprobante (e-Factura, Factura, Ticket, e-Ticket, Boleta, Remito, etc)",
  "moneda": "UYU o USD",
  "items": [
    {
      "codigo": "código del artículo o string vacío si no hay",
      "descripcion": "descripción completa del artículo o servicio",
      "cantidad": número,
      "precioUnitario": número sin símbolo de moneda,
      "descuento": porcentaje de descuento como número (0 si no hay),
      "impuesto": porcentaje de IVA aplicado (10, 22 o 0),
      "subtotal": monto sin impuesto,
      "totalItem": monto total del ítem incluyendo impuesto
    }
  ],
  "neto": monto neto total sin IVA como número,
  "iva10": monto de IVA al 10% como número o null,
  "iva22": monto de IVA al 22% como número o null,
  "ivaTotal": monto total de IVA como número,
  "total": monto total del documento como número
}

REGLAS OBLIGATORIAS:
- Si hay artículos bonificados, regalados o con precio cero: incluirlos con precioUnitario=0 y descripcion comenzando con "BONIFICACIÓN: "
- Si no podés leer un campo de texto: usar string vacío ""
- Si no podés leer un número: usar 0
- El array items es OBLIGATORIO, mínimo 1 ítem
- Si no hay ítems individuales visibles, crear 1 ítem con la descripción general y los totales del documento
- NO incluir símbolo de moneda en los valores numéricos`;

function parseResponse(text: string): Partial<ExtractedInvoice> {
  const clean = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return {};
  }
}

export async function extractFromImage(
  filePath: string,
  mimeType: string
): Promise<Partial<ExtractedInvoice>> {
  const data = fs.readFileSync(filePath).toString('base64');
  const parts: Part[] = [
    { inlineData: { mimeType, data } },
    { text: PROMPT },
  ];
  const result = await model.generateContent(parts);
  return parseResponse(result.response.text());
}

export async function extractFromPDF(filePath: string): Promise<Partial<ExtractedInvoice>> {
  const data = fs.readFileSync(filePath).toString('base64');
  const parts: Part[] = [
    { inlineData: { mimeType: 'application/pdf', data } },
    { text: PROMPT },
  ];
  const result = await model.generateContent(parts);
  return parseResponse(result.response.text());
}
