// Limitador por ventana fija, en memoria del proceso.
//
// Qué garantiza y qué no: en Vercel cada instancia de la función tiene su propia
// memoria, y bajo carga la plataforma levanta varias. O sea que el límite real es
// "N por minuto por instancia", no N por minuto en total. Frena el caso normal —un
// bucle en el cliente, alguien reintentando de más, un script casero— pero no a un
// atacante distribuido decidido.
//
// Para un techo duro hace falta estado compartido: Upstash Redis o una tabla en
// Postgres. Se deja esto porque no agrega dependencias ni infraestructura, y porque
// el control que de verdad importa acá es que el endpoint exija sesión: sin cuenta
// no se llega a gastar cuota de nadie.

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

// Sin esto el Map crece sin techo mientras el proceso viva.
function prune(now: number) {
  if (buckets.size < 5000) return;
  // forEach y no for..of: el target de TS del proyecto no permite iterar un Map.
  const expired: string[] = [];
  buckets.forEach((hit, key) => { if (hit.resetAt <= now) expired.push(key); });
  expired.forEach((key) => buckets.delete(key));
}

export type RateVerdict = { ok: true } | { ok: false; retryAfter: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateVerdict {
  const now = Date.now();
  prune(now);

  const hit = buckets.get(key);
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (hit.count >= limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)) };
  }

  hit.count += 1;
  return { ok: true };
}
