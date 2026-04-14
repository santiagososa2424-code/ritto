import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  res.json({
    ok: hasGemini && hasSupabaseUrl && hasSupabaseKey,
    gemini_key_set: hasGemini,
    gemini_key_prefix: hasGemini ? process.env.GEMINI_API_KEY!.slice(0, 6) + '...' : null,
    supabase_url_set: hasSupabaseUrl,
    supabase_key_set: hasSupabaseKey,
    node_env: process.env.NODE_ENV,
  });
}
