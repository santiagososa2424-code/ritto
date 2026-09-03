import type { NextApiRequest } from 'next';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function getAuthUser(req: NextApiRequest) {
  const token = (req.headers.authorization ?? '').replace('Bearer ', '').trim();
  if (!token) return null;
  try {
    const { data: { user } } = await getAdminClient().auth.getUser(token);
    return user ?? null;
  } catch {
    return null;
  }
}
