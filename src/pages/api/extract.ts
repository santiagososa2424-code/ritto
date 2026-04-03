import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { parseCFE } from '../../lib/cfeParser';
import { extractFromImage, extractFromPDF } from '../../lib/geminiExtractor';
import type { ExtractedInvoice } from '../../lib/types';

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const form = formidable({ maxFileSize: 20 * 1024 * 1024 });

  let fields: formidable.Fields;
  let files: formidable.Files;
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
      extracted = await extractFromPDF(file.filepath);
      return res.json({ ...base, source: 'pdf', status: 'done', ...extracted });
    }

    if (isImage) {
      extracted = await extractFromImage(file.filepath, mimeType);
      return res.json({ ...base, source: 'image', status: 'done', ...extracted });
    }

    return res.status(400).json({ ...base, status: 'error', error: 'Tipo de archivo no soportado' });
  } catch (err) {
    console.error('Error extrayendo:', err);
    return res.status(500).json({ ...base, status: 'error', error: 'Error al procesar el archivo' });
  }
}
