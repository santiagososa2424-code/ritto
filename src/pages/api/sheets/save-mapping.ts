import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const { mapping } = req.body as { mapping: Record<string, string> };
  if (!mapping || typeof mapping !== 'object') return res.status(400).json({ error: 'mapping is required' });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await supabase
    .from('profiles')
    .update({ sheet_column_mapping: mapping })
    .eq('id', user.id);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
