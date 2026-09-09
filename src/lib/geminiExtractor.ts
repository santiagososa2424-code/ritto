import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import fs from 'fs';
import type { ExtractedInvoice } from './types';

function getModel() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY no configurada en el servidor');
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-3.6-flash' });
}

const PROMPT = `Sos un sistema experto en extracción de datos de comprobantes fiscales uruguayos (CFE - Comprobantes Fiscales Electrónicos).
Tu tarea es leer el documento y extraer los datos con la máxima precisión posible.
Respondé ÚNICAMENTE con un JSON válido, sin texto adicional, sin bloques de código markdown, sin explicaciones.

FORMATO DE RESPUESTA (devolvé exactamente esta estructura):
{
  "proveedor": "nombre fantasía o razón social del EMISOR — nunca su dirección",
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

CÓMO ELEGIR EL "proveedor" (leelo antes que nada):
En la cabecera de un CFE conviven, con tipografías muy parecidas, tres cosas
distintas: la razón social (ej: "Distribuidora Abasto S.A."), el nombre fantasía
(ej: "Abasto") y la dirección fiscal (ej: "Av. Italia 1234"). Son fáciles de
confundir. Para no equivocarte:
 a. El proveedor es el EMISOR: quien vende y emite el comprobante. Nunca el
    receptor o cliente, que aparece más abajo bajo "Señor(es)", "Cliente" o
    "Receptor" — ese es quien recibe la factura y no va en este campo.
 b. Elegí el nombre fantasía o la razón social. Si ves los dos, preferí el que
    identifica al comercio (ej: "Abasto" antes que "Distribuidora Abasto S.A.").
 c. PROHIBIDO poner una dirección. Nunca uses calles, avenidas, esquinas,
    números de puerta, rutas, kilómetros, barrios, ciudades ni departamentos.
    Ej: jamás "Av. Italia 1234", "Mercedes 987", "Ruta 8 Km 17", "Montevideo".
 d. Tampoco uses teléfonos, correos, sitios web ni el texto del pie de página.
 e. Ante la duda, el proveedor es el nombre que está junto al RUT del emisor,
    arriba de todo en el documento.

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

// La cabecera de un CFE pone la razón social y la dirección fiscal casi con la misma
// tipografía, y el modelo a veces devuelve la calle como proveedor. Marcarlo como
// error de validación reusa el reintento que ya existe: se le pide la corrección
// puntual y, si vuelve a fallar, la factura queda señalada para revisar en vez de
// entrar a la planilla con el nombre de una avenida.
const STREET_WORD = /^(calle|av|avda|avenida|bv|bvar|bulevar|blvd|br|rambla|ruta|rte|camino|cno|pasaje|psje|peatonal|plaza|km|esq|esquina)\b/;

function looksLikeAddress(name: string): boolean {
  const n = name.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (!n) return false;
  if (STREET_WORD.test(n)) return true;
  // "Mercedes 1234": un nombre que termina en un número de puerta suele ser la
  // dirección. Una empresa rara vez se llama así.
  if (/\s\d{3,5}$/.test(n)) return true;
  return false;
}

function validateExtraction(data: Partial<ExtractedInvoice>): ValidationResult {
  const errors: string[] = [];

  if (!data.items || data.items.length === 0) {
    errors.push('items vacío');
  }

  if (data.proveedor && looksLikeAddress(data.proveedor)) {
    errors.push(
      `"${data.proveedor}" parece una dirección, no un proveedor: usá el nombre fantasía o la razón social del emisor, nunca su calle`,
    );
  }

  const neto = Number(data.neto ?? 0);
  const ivaTotal = Number(data.ivaTotal ?? 0);
  const total = Number(data.total ?? 0);

  if (total > 0 && neto > 0) {
    const computed = neto + ivaTotal;
    const diff = Math.abs(computed - total);
    const tolerance = Math.max(1, total * 0.01);
    if (diff > tolerance) {
      errors.push(`totales no cuadran: neto(${neto}) + iva(${ivaTotal}) = ${computed}, pero total=${total}`);
    }
  }

  if (data.rut && data.rut.trim() !== '') {
    const rutPattern = /^\d{1,2}\.\d{3}\.\d{3}-\d$/;
    if (!rutPattern.test(data.rut.trim())) {
      errors.push(`RUT con formato incorrecto: "${data.rut}"`);
    }
  }

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

// Un reintento manda el archivo entero de nuevo, así que cuesta casi lo mismo que el
// primer intento. Con un PDF pesado, tres llamadas encadenadas se pasan del tiempo que
// la plataforma le da a la función y el usuario recibe un 504 sin ningún dato. Cuando
// ya no queda margen preferimos devolver lo que tenemos, marcado para revisar.
const RETRY_BUDGET_MS = 18_000;

async function extractWithRetry(parts: Part[]): Promise<Partial<ExtractedInvoice> & { _validationWarning?: string }> {
  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;
  const roomForAnotherCall = () => elapsed() + RETRY_BUDGET_MS < 45_000;

  const rawText = await callGemini(parts);

  let extracted: Partial<ExtractedInvoice>;
  try {
    extracted = parseResponse(rawText);
  } catch {
    // Sin JSON no hay nada que devolver, así que este reintento va igual.
    const retryText = await callGemini(buildRetryParts(parts, ['JSON inválido — respondé SOLO con JSON, sin texto adicional']));
    extracted = parseResponse(retryText);
  }

  const validation = validateExtraction(extracted);
  if (validation.valid) return extracted;

  // Acá sí tenemos datos utilizables: el reintento solo los mejora, no vale quedarse
  // sin respuesta por intentarlo.
  if (!roomForAnotherCall()) {
    return { ...extracted, _validationWarning: validation.errors.join('; ') };
  }

  const retryParts: Part[] = [
    ...parts.slice(0, -1),
    { text: parts[parts.length - 1].text + RETRY_PROMPT_SUFFIX(validation.errors) },
  ];

  let retried: Partial<ExtractedInvoice>;
  try {
    const retriedText = await callGemini(retryParts);
    retried = parseResponse(retriedText);
  } catch {
    return { ...extracted, _validationWarning: validation.errors.join('; ') };
  }

  const retryValidation = validateExtraction(retried);
  if (retryValidation.valid) return retried;

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
