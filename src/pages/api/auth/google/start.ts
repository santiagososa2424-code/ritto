import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthUser } from '../../../../lib/auth';
import { newNonce, packState } from '../../../../lib/oauthState';

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

// Devuelve la URL de Google en vez de redirigir. Es a propósito: la sesión de Supabase
// vive en localStorage, no en una cookie, así que el navegador no la manda sola en una
// redirección de primer nivel. El cliente llama acá con su token, recibe la URL ya
// firmada y recién ahí se va a Google.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) return res.status(503).json({ error: 'Google no está configurado en el servidor' });

  const returnTo = req.body?.returnTo === 'onboarding' ? 'onboarding' : undefined;
  const nonce = newNonce();
  // El userId sale del token verificado, nunca de lo que mande el cliente.
  const state = packState({ uid: user.id, nonce, returnTo });

  // El nonce queda en una cookie del mismo navegador: la firma prueba quién pidió el
  // flujo, y la cookie prueba que quien vuelve de Google es el mismo que lo empezó.
  res.setHeader('Set-Cookie', `g_nonce=${nonce}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return res.status(200).json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
}
