import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state: userId, error } = req.query;

  if (error || !code || !userId) {
    return res.redirect(`/settings?error=google_denied&detail=${encodeURIComponent(String(error ?? 'missing_code'))}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return res.redirect('/settings?error=google_not_configured');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      const detail = tokens.error_description ?? tokens.error ?? 'no_token';
      console.error('[google callback] token error:', tokens);
      return res.redirect(`/settings?error=google_token&detail=${encodeURIComponent(detail)}`);
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let googleEmail: string | null = null;
    try {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profileData = await profileRes.json();
      googleEmail = profileData.email ?? null;
    } catch (_) {}

    const { error: dbErr } = await supabase.from('profiles').update({
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token ?? null,
      google_token_expires_at: new Date(Date.now() + (tokens.expires_in as number) * 1000).toISOString(),
      ...(googleEmail ? { google_email: googleEmail } : {}),
    }).eq('id', userId as string);

    if (dbErr) {
      console.error('[google callback] supabase error:', dbErr);
      return res.redirect(`/settings?error=google_token&detail=${encodeURIComponent(dbErr.message)}`);
    }

    res.redirect('/settings?google=connected');
  } catch (e) {
    console.error('[google callback] exception:', e);
    res.redirect('/settings?error=google_token&detail=exception');
  }
}
