import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// El `state` de OAuth va firmado por el servidor. Antes viajaba el userId en la URL sin
// ninguna prueba de identidad, así que cualquiera podía iniciar el flujo a nombre de
// otro y dejarle sus propios tokens de Google en el perfil. Ahora sólo lo emite un
// endpoint autenticado y el callback verifica la firma: sin la clave del servidor no se
// puede fabricar un state para otra cuenta.
//
// Va firmado y no cifrado a propósito: el contenido no es secreto (un userId), lo que
// importa es que no se pueda alterar.

const TTL_MS = 10 * 60 * 1000;

function secret(): string {
  const key = process.env.OAUTH_STATE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Falta OAUTH_STATE_SECRET o SUPABASE_SERVICE_ROLE_KEY para firmar el state');
  return key;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

export type OAuthState = { uid: string; nonce: string; returnTo?: string };

export function newNonce(): string {
  return randomBytes(16).toString('hex');
}

export function packState(state: OAuthState): string {
  const body = Buffer.from(JSON.stringify({ ...state, exp: Date.now() + TTL_MS })).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function unpackState(raw: string): OAuthState | null {
  const dot = raw.lastIndexOf('.');
  if (dot < 1) return null;

  const body = raw.slice(0, dot);
  const given = Buffer.from(raw.slice(dot + 1));
  const expected = Buffer.from(sign(body));
  // Comparación en tiempo constante: comparar con === filtra la clave de a un byte.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (typeof data?.uid !== 'string' || typeof data?.nonce !== 'string') return null;
    if (typeof data?.exp !== 'number' || Date.now() > data.exp) return null;
    return { uid: data.uid, nonce: data.nonce, returnTo: typeof data.returnTo === 'string' ? data.returnTo : undefined };
  } catch {
    return null;
  }
}
