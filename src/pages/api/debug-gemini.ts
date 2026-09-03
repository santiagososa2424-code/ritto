import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.json({ ok: false, error: 'GEMINI_API_KEY no configurada' });

  try {
    const model = new GoogleGenerativeAI(key).getGenerativeModel({ model: 'gemini-3.6-flash' });
    const result = await model.generateContent('Respondé solo con: ok');
    const text = result.response.text();
    return res.json({ ok: true, response: text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.json({ ok: false, error: msg });
  }
}
