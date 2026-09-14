import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '../../../lib/auth';

// Quién puede ver los errores. Va por variable de entorno para no tener que tocar el
// código si mañana lo mira otra persona; el valor por defecto es el mismo mail que ya
// figura como soporte en toda la app.
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'santiagososa2424@gmail.com').toLowerCase();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'No autorizado' });
  // 404 y no 403: al que no es admin no se le confirma que este panel exista.
  if ((user.email ?? '').toLowerCase() !== ADMIN_EMAIL) return res.status(404).end();

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supabaseAdmin
    .from('error_log')
    .select('id, ocurrido, ambito, mensaje, stack, user_id, contexto')
    .order('ocurrido', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });

  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const ultimasHoras = (data ?? []).filter((e) => e.ocurrido > desde);

  return res.status(200).json({
    errores: data ?? [],
    // Cuántos hubo en el último día y a cuánta gente distinta le pasó: un error que le
    // pasa a cinco clientes es otra cosa que uno que le pasa cinco veces al mismo.
    resumen: {
      ultimoDia: ultimasHoras.length,
      usuariosAfectados: new Set(ultimasHoras.map((e) => e.user_id).filter(Boolean)).size,
    },
  });
}
