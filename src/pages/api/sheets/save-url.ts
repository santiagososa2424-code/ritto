import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { userId, sheetUrl } = req.body as { userId: string; sheetUrl: string };
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ google_sheet_id: sheetUrl || null })
    .eq('id', userId);

  if (error) {
    console.error('[save-url] supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true });
}
