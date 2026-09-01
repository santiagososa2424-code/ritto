import type { NextApiRequest, NextApiResponse } from 'next';

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.redirect('/settings?error=google_not_configured');
  }

  const returnTo = req.query.returnTo as string | undefined;
  const state = returnTo ? `${userId}:${returnTo}` : userId;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
