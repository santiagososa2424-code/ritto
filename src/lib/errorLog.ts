import { createClient } from '@supabase/supabase-js';

// Guardar un error para poder enterarse antes que el cliente.
//
// Dos reglas que no se negocian:
//
// 1. Nunca tira. Si el registro falla, la petición que lo llamó tiene que seguir su
//    curso: sería absurdo que el sistema de avisos rompa lo que venía funcionando.
// 2. Nunca guarda el contenido de la factura ni credenciales. `contexto` es para datos
//    de forma —qué pestaña, cuántas facturas, qué código de estado—, no para el
//    documento del cliente.

// Un stack entero no aporta y llena la tabla: con las primeras líneas alcanza para
// saber de dónde salió.
const STACK_MAX = 2000;

export async function logError(
  ambito: string,
  err: unknown,
  datos?: { userId?: string | null; contexto?: Record<string, unknown> },
): Promise<void> {
  const mensaje = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error && err.stack ? err.stack.slice(0, STACK_MAX) : null;

  // Que quede también en los logs de Vercel: si la base es justamente lo que falla,
  // esta línea es lo único que queda.
  console.error(`[${ambito}]`, mensaje);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    await createClient(url, key).from('error_log').insert({
      ambito,
      mensaje: mensaje.slice(0, 1000),
      stack,
      user_id: datos?.userId ?? null,
      contexto: datos?.contexto ?? null,
    });
  } catch {
    // Ver la regla 1.
  }
}
