import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files } from 'formidable';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { parseCFE } from '../../lib/cfeParser';
import { extractFromImage, extractFromPDF } from '../../lib/geminiExtractor';
import type { ExtractedInvoice } from '../../lib/types';

export const config = { api: { bodyParser: false }, maxDuration: 60 };

function friendlyError(msg: string, type: 'pdf' | 'image' | 'other'): string {
  const m = msg.toLowerCase();
  if (m.includes('maxfilesize') || m.includes('file size') || m.includes('1009'))
    return 'El archivo pesa demasiado (máximo 20 MB). Comprimilo e intentá de nuevo.';
  if (m.includes('resource_exhausted') || m.includes('quota') || m.includes('429') || m.includes('rate limit'))
    return 'El servicio de IA está saturado. Esperá unos minutos e intentá de nuevo.';
  if (m.includes('api_key') || m.includes('api key') || m.includes('401') || m.includes('unauthorized'))
    return 'Error de configuración del servidor. Contactá soporte@ritto.lat';
  if (m.includes('safety') || m.includes('blocked'))
    return 'El archivo fue bloqueado por filtros de seguridad. Contactá soporte@ritto.lat';
  if (m.includes('json') || m.includes('parse') || m.includes('invalid'))
    return type === 'image'
      ? 'No pudimos leer la imagen. Probá con más luz, mejor enfoque, o convertila a PDF.'
      : 'No pudimos extraer datos del PDF. Verificá que no esté protegido con contraseña.';
  if (m.includes('timeout') || m.includes('econnreset') || m.includes('etimedout'))
    return 'La extracción tardó demasiado. Probá con un archivo más liviano.';
  return type === 'image'
    ? 'No pudimos procesar la imagen. Probá con más luz o mejor enfoque.'
    : type === 'pdf'
    ? 'No pudimos procesar el PDF. Probá con otro archivo o subilo como imagen.'
    : 'No se pudo procesar el archivo.';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ status: 'error', error: 'GEMINI_API_KEY no configurada en el servidor' });
  }

  const form = formidable({ maxFileSize: 20 * 1024 * 1024 });

  let fields: Fields;
  let files: Files;
  try {
    [fields, files] = await form.parse(req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const friendly = msg.toLowerCase().includes('maxfilesize') || msg.toLowerCase().includes('1009')
      ? 'El archivo pesa demasiado (máximo 20 MB). Comprimilo e intentá de nuevo.'
      : 'No se pudo leer el archivo. Verificá que no esté dañado.';
    return res.status(400).json({ status: 'error', error: friendly });
  }

  const fileArr = files.file;
  if (!fileArr || fileArr.length === 0) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' });
  }

  const file = fileArr[0];
  const fileName = file.originalFilename ?? 'desconocido';
  const mimeType = file.mimetype ?? '';
  const id = (Array.isArray(fields.id) ? fields.id[0] : fields.id) ?? randomUUID();

  const base: Pick<ExtractedInvoice, 'id' | 'fileName'> = { id, fileName };

  const isXML =
    mimeType === 'text/xml' ||
    mimeType === 'application/xml' ||
    fileName.toLowerCase().endsWith('.xml');
  const isPDF = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const isImage = mimeType.startsWith('image/');

  try {
    if (isXML) {
      const content = fs.readFileSync(file.filepath, 'utf-8');
      const parsed = parseCFE(content);
      return res.json({ ...base, source: 'cfe_xml', status: 'done', ...parsed });
    }

    if (isPDF) {
      const result = await extractFromPDF(file.filepath);
      const { _validationWarning, ...rest } = result as typeof result & { _validationWarning?: string };
      return res.json({ ...base, source: 'pdf', status: 'done', ...rest, ...(_validationWarning ? { warning: _validationWarning } : {}) });
    }

    if (isImage) {
      const result = await extractFromImage(file.filepath, mimeType);
      const { _validationWarning, ...rest } = result as typeof result & { _validationWarning?: string };
      return res.json({ ...base, source: 'image', status: 'done', ...rest, ...(_validationWarning ? { warning: _validationWarning } : {}) });
    }

    return res.status(400).json({ ...base, status: 'error', error: 'Tipo de archivo no soportado' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error extrayendo:', msg);
    const friendly = friendlyError(msg, isPDF ? 'pdf' : isImage ? 'image' : 'other');
    return res.status(500).json({ ...base, status: 'error', error: friendly });
  }
}
