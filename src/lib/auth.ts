import type { NextApiRequest } from 'next';
import { createClient } from '@supabase/supabase-js';

export async function getAuthUser(req: NextApiRequest) {
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim();
  if (!token) return null;
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user ?? null;
}
