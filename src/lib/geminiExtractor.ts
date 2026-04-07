import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import type { ExtractedInvoice } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const PROMPT = `Sos un sistema de extracción de datos para facturas uruguayas.
Extraé los siguientes campos del documento y respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código:

{
  "proveedor": "nombre de la empresa emisora",
  "rut": "RUT del emisor en formato XX.XXX.XXX-X",
  "fecha": "fecha de emisión en formato YYYY-MM-DD",
  "nroDocumento": "número de documento completo (ej: A-0001234)",
  "tipoDocumento": "tipo de comprobante (e-Factura, Factura, Ticket, e-Ticket, Boleta, etc)",
  "moneda": "UYU o USD",
  "neto": monto neto sin IVA como número,
  "iva10": monto IVA 10% como número o null,
  "iva22": monto IVA 22% como número o null,
  "ivaTotal": monto total de IVA como número,
  "total": monto total del documento como número
}

Si un campo no está presente o no podés leerlo, usá null. No incluyas símbolo de moneda en los números.`;

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
  const result = await model.generateContent([
    { inlineData: { mimeType, data } },
    PROMPT,
  ]);
  return parseResponse(result.response.text());
}

export async function extractFromPDF(filePath: string): Promise<Partial<ExtractedInvoice>> {
  const data = fs.readFileSync(filePath).toString('base64');
  const result = await model.generateContent([
    { inlineData: { mimeType: 'application/pdf', data } },
    PROMPT,
  ]);
  return parseResponse(result.response.text());
}
