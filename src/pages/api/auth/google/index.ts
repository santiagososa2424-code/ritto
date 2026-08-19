import type { NextApiRequest, NextApiResponse } from 'next';

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: userId,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
