import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files } from 'formidable';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { parseCFE } from '../../lib/cfeParser';
import { extractFromImage, extractFromPDF } from '../../lib/geminiExtractor';
import type { ExtractedInvoice } from '../../lib/types';

export const config = { api: { bodyParser: false }, maxDuration: 60 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = formidable({ maxFileSize: 20 * 1024 * 1024 });

  let fields: Fields;
  let files: Files;
  try {
    [fields, files] = await form.parse(req);
  } catch {
    return res.status(400).json({ error: 'Error parseando el archivo' });
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

  try {
    let extracted: Partial<ExtractedInvoice> = {};

    const isXML =
      mimeType === 'text/xml' ||
      mimeType === 'application/xml' ||
      fileName.toLowerCase().endsWith('.xml');

    const isPDF =
      mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

    const isImage = mimeType.startsWith('image/');

    if (isXML) {
      const content = fs.readFileSync(file.filepath, 'utf-8');
      extracted = parseCFE(content);
      return res.json({ ...base, source: 'cfe_xml', status: 'done', ...extracted });
    }

    if (isPDF) {
      const result = await extractFromPDF(file.filepath);
      const { _validationWarning, ...rest } = result as typeof result & { _validationWarning?: string };
      return res.json({ ...base, source: 'pdf', status: 'done', ...rest, ...((_validationWarning) ? { warning: _validationWarning } : {}) });
    }

    if (isImage) {
      const result = await extractFromImage(file.filepath, mimeType);
      const { _validationWarning, ...rest } = result as typeof result & { _validationWarning?: string };
      return res.json({ ...base, source: 'image', status: 'done', ...rest, ...((_validationWarning) ? { warning: _validationWarning } : {}) });
    }

    return res.status(400).json({ ...base, status: 'error', error: 'Tipo de archivo no soportado' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error extrayendo:', msg);
    return res.status(500).json({ ...base, status: 'error', error: msg });
  }
}
