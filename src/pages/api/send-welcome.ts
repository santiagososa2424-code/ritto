import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, nombre, plan, sistema } = req.body as {
    email: string;
    nombre?: string;
    plan?: string;
    sistema?: string;
  };

  if (!email) return res.status(400).json({ error: 'Email requerido' });

  const nombreDisplay = nombre?.trim() || 'ahí';
  const planDisplay = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Pyme';
  const sistemaDisplay =
    sistema === 'zeta' ? 'ZetaSoftware' : sistema === 'siigo' ? 'Siigo' : 'GNS Contable';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido a Ritto</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <span style="font-family:Georgia,serif;font-size:32px;color:#0a7c59;font-weight:400;letter-spacing:-0.5px;">ritto</span>
            </td>
          </tr>

          <!-- Hero card -->
          <tr>
            <td style="background:#ffffff;border-radius:16px;border:1px solid #e0e0e0;padding:40px 36px;">
              <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;color:#111111;font-weight:400;line-height:1.2;">
                Bienvenido, ${nombreDisplay} 👋
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#6b6b6b;line-height:1.6;">
                Tu cuenta en Ritto está lista. Ahora podés procesar facturas y exportarlas
                directamente a <strong style="color:#111111;">${sistemaDisplay}</strong> en segundos.
              </p>

              <!-- Plan badge -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#e6f4ef;border-radius:8px;padding:14px 20px;">
                    <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#0a7c59;text-transform:uppercase;letter-spacing:0.5px;">Tu plan</p>
                    <p style="margin:0;font-size:18px;font-weight:700;color:#0a7c59;">Plan ${planDisplay} · 14 días gratis</p>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="padding-bottom:16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;height:32px;background:#0a7c59;border-radius:50%;text-align:center;vertical-align:middle;">
                          <span style="color:#fff;font-size:14px;font-weight:700;">1</span>
                        </td>
                        <td style="padding-left:14px;">
                          <p style="margin:0;font-size:14px;color:#111111;font-weight:600;">Subí tus facturas</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#6b6b6b;">Imágenes, PDFs o archivos XML de CFE</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:16px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;height:32px;background:#0a7c59;border-radius:50%;text-align:center;vertical-align:middle;">
                          <span style="color:#fff;font-size:14px;font-weight:700;">2</span>
                        </td>
                        <td style="padding-left:14px;">
                          <p style="margin:0;font-size:14px;color:#111111;font-weight:600;">Ritto las procesa</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#6b6b6b;">Extracción automática con inteligencia artificial</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:32px;height:32px;background:#0a7c59;border-radius:50%;text-align:center;vertical-align:middle;">
                          <span style="color:#fff;font-size:14px;font-weight:700;">3</span>
                        </td>
                        <td style="padding-left:14px;">
                          <p style="margin:0;font-size:14px;color:#111111;font-weight:600;">Exportá a Excel</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#6b6b6b;">Formato listo para importar en ${sistemaDisplay}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://ritto.lat/app"
                       style="display:inline-block;background:#0a7c59;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.2px;">
                      Ir al dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 0;">
              <p style="margin:0;font-size:12px;color:#9b9b9b;line-height:1.6;">
                Ritto · Montevideo, Uruguay<br/>
                ¿Preguntas? Escribinos a <a href="mailto:soporte@ritto.lat" style="color:#0a7c59;text-decoration:none;">soporte@ritto.lat</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: 'Ritto <bienvenida@ritto.lat>',
      to: email,
      subject: `Bienvenido a Ritto, ${nombreDisplay} 🎉`,
      html,
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('Error enviando email:', err);
    return res.status(500).json({ error: 'No se pudo enviar el email' });
  }
}
