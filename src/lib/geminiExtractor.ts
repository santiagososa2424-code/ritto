import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import fs from 'fs';
import type { ExtractedInvoice } from './types';

function getModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY no configurada en el servidor');
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-2.5-flash' });
}

const PROMPT = `Sos un sistema experto en extracción de datos de comprobantes fiscales uruguayos (CFE - Comprobantes Fiscales Electrónicos).
Tu tarea es leer el documento y extraer los datos con la máxima precisión posible.
Respondé ÚNICAMENTE con un JSON válido, sin texto adicional, sin bloques de código markdown, sin explicaciones.

FORMATO DE RESPUESTA (devolvé exactamente esta estructura):
{
  "proveedor": "razón social o nombre comercial completo del emisor",
  "rut": "RUT del emisor en formato XX.XXX.XXX-X (con puntos y guion)",
  "fecha": "fecha de emisión en formato YYYY-MM-DD",
  "nroDocumento": "número de serie y número del documento (ej: A-0001234 o E-0001234)",
  "tipoDocumento": "e-Factura | e-Ticket | Factura | Ticket | e-Remito | Remito | e-Nota de Crédito | Nota de Crédito",
  "moneda": "UYU o USD",
  "items": [
    {
      "codigo": "código del artículo si aparece, si no: string vacío",
      "descripcion": "descripción completa y exacta del artículo o servicio",
      "cantidad": 1,
      "precioUnitario": 0.00,
      "descuento": 0,
      "impuesto": 22,
      "subtotal": 0.00,
      "totalItem": 0.00
    }
  ],
  "neto": 0.00,
  "iva10": null,
  "iva22": 0.00,
  "ivaTotal": 0.00,
  "total": 0.00
}

REGLAS CRÍTICAS PARA URUGUAY:
1. RUT: siempre en formato XX.XXX.XXX-X (ej: 21.234.567-8). Si tiene dígito verificador, incluiló.
2. IVA en Uruguay: básico=22%, mínimo=10%, exento=0%. Identificá correctamente cuál aplica a cada ítem.
3. TOTALES: neto + ivaTotal DEBE ser igual a total. Verificalo antes de responder.
4. neto = suma de subtotales de ítems (sin IVA)
5. ivaTotal = iva10 + iva22 (los que correspondan, null si no aplica esa tasa)
6. ÍTEMS BONIFICADOS o con precio cero: incluirlos con precioUnitario=0, descripcion con prefijo "BONIFICACIÓN: "
7. DESCUENTOS: si hay un porcentaje de descuento, registrarlo en el campo "descuento" del ítem
8. Si el documento tiene descuentos globales, distribuirlos proporcionalmente en cada ítem
9. Si no podés leer texto: usar "" (string vacío)
10. Si no podés leer número: usar 0
11. El array items es OBLIGATORIO y debe tener al menos 1 elemento
12. Si el documento no tiene ítems detallados, crear 1 ítem con descripción general del servicio/producto
13. precioUnitario y subtotal deben ser SIN IVA
14. totalItem debe ser CON IVA incluido
15. NO incluir símbolo de moneda ($, U$S) en valores numéricos
16. Usar punto (.) como separador decimal, NO coma

VERIFICACIÓN FINAL antes de responder:
- ¿neto + ivaTotal ≈ total? (tolerancia: diferencia menor a 1 unidad monetaria)
- ¿items array tiene al menos 1 elemento?
- ¿RUT tiene formato correcto con puntos y guión?
- ¿fecha está en formato YYYY-MM-DD?`;

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateExtraction(data: Partial<ExtractedInvoice>): ValidationResult {
  const errors: string[] = [];

  // Items array must exist and have at least 1 item
  if (!data.items || data.items.length === 0) {
    errors.push('items vacío');
  }

  // Total consistency: neto + ivaTotal ≈ total (within 1% or 1 currency unit)
  const neto = Number(data.neto ?? 0);
  const ivaTotal = Number(data.ivaTotal ?? 0);
  const total = Number(data.total ?? 0);

  if (total > 0 && neto > 0) {
    const computed = neto + ivaTotal;
    const diff = Math.abs(computed - total);
    const tolerance = Math.max(1, total * 0.01); // 1 unit or 1%, whichever is bigger
    if (diff > tolerance) {
      errors.push(`totales no cuadran: neto(${neto}) + iva(${ivaTotal}) = ${computed}, pero total=${total}`);
    }
  }

  // RUT format check: XX.XXX.XXX-X
  if (data.rut && data.rut.trim() !== '') {
    const rutPattern = /^\d{1,2}\.\d{3}\.\d{3}-\d$/;
    if (!rutPattern.test(data.rut.trim())) {
      errors.push(`RUT con formato incorrecto: "${data.rut}"`);
    }
  }

  // Date format check: YYYY-MM-DD
  if (data.fecha && data.fecha.trim() !== '') {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(data.fecha.trim())) {
      errors.push(`fecha con formato incorrecto: "${data.fecha}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function parseResponse(text: string): Partial<ExtractedInvoice> {
  const clean = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Gemini no devolvió JSON válido');
  }
}

async function callGemini(parts: Part[]): Promise<string> {
  const result = await getModel().generateContent({
    contents: [{ role: 'user', parts }],
    generationConfig: {
      thinkingConfig: { thinkingBudget: 0 }, // disable thinking = faster
    } as any,
  });
  return result.response.text();
}

const RETRY_PROMPT_SUFFIX = (errors: string[]) => `

CORRECCIÓN REQUERIDA: El intento anterior tuvo los siguientes errores:
${errors.map(e => `- ${e}`).join('\n')}

Por favor corregí estos errores específicamente y respondé con un JSON válido.`;

function buildRetryParts(parts: Part[], errors: string[]): Part[] {
  const lastPart = parts[parts.length - 1];
  const baseText = (lastPart as { text?: string }).text ?? '';
  return [
    ...parts.slice(0, -1),
    { text: baseText + RETRY_PROMPT_SUFFIX(errors) },
  ];
}

async function extractWithRetry(parts: Part[]): Promise<Partial<ExtractedInvoice> & { _validationWarning?: string }> {
  // First attempt — let real API errors (auth, quota, etc.) propagate immediately
  const rawText = await callGemini(parts);

  // Try parsing — only retry if JSON is invalid
  let extracted: Partial<ExtractedInvoice>;
  try {
    extracted = parseResponse(rawText);
  } catch {
    // JSON parse failed — retry once with explicit instruction
    const retryText = await callGemini(buildRetryParts(parts, ['JSON inválido — respondé SOLO con JSON, sin texto adicional']));
    extracted = parseResponse(retryText); // if this also fails, let it throw
  }

  const validation = validateExtraction(extracted);
  if (validation.valid) return extracted;

  // Validation failed — retry once with specific error context
  const retryParts: Part[] = [
    ...parts.slice(0, -1),
    { text: parts[parts.length - 1].text + RETRY_PROMPT_SUFFIX(validation.errors) },
  ];

  let retried: Partial<ExtractedInvoice>;
  try {
    const retriedText = await callGemini(retryParts);
    retried = parseResponse(retriedText);
  } catch {
    // If retry also fails, return original with warning
    return { ...extracted, _validationWarning: validation.errors.join('; ') };
  }

  const retryValidation = validateExtraction(retried);
  if (retryValidation.valid) return retried;

  // Both attempts failed validation — return best attempt with warning
  // Prefer retry result if it has fewer errors
  const best = retryValidation.errors.length <= validation.errors.length ? retried : extracted;
  const worstErrors = retryValidation.errors.length <= validation.errors.length
    ? retryValidation.errors
    : validation.errors;

  return { ...best, _validationWarning: worstErrors.join('; ') };
}

export async function extractFromImage(
  filePath: string,
  mimeType: string
): Promise<Partial<ExtractedInvoice> & { _validationWarning?: string }> {
  const data = fs.readFileSync(filePath).toString('base64');
  const parts: Part[] = [
    { inlineData: { mimeType, data } },
    { text: PROMPT },
  ];
  return extractWithRetry(parts);
}

export async function extractFromPDF(
  filePath: string
): Promise<Partial<ExtractedInvoice> & { _validationWarning?: string }> {
  const data = fs.readFileSync(filePath).toString('base64');
  const parts: Part[] = [
    { inlineData: { mimeType: 'application/pdf', data } },
    { text: PROMPT },
  ];
  return extractWithRetry(parts);
}
