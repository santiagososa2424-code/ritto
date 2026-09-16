// El soporte, en un solo lugar.
//
// Estaba repetido como un mailto en once archivos, así que cambiarlo implicaba
// acordarse de los once. Y al principio conviene el teléfono antes que el mail: el que
// recién conecta su planilla y ve algo raro no escribe un mail, abandona.

export const SOPORTE_TEL = '093403706';
// Formato internacional, sin signos, como lo pide wa.me.
const SOPORTE_TEL_INTL = '59893403706';

export const SOPORTE_WHATSAPP = `https://wa.me/${SOPORTE_TEL_INTL}?text=${encodeURIComponent(
  'Hola Ritto, necesito ayuda con mi cuenta.',
)}`;

// Para los textos: "escribinos al 093403706 por WhatsApp".
export const SOPORTE_TEXTO = `escribinos por WhatsApp al ${SOPORTE_TEL}`;

// Para los mensajes de error del servidor, donde no hay link que clickear.
export const SOPORTE_ERROR = `Escribinos por WhatsApp al ${SOPORTE_TEL}`;

// Abre el chat con un mensaje distinto según desde dónde se pidió ayuda, así no hay que
// preguntar "¿en qué pantalla estabas?".
export function whatsappCon(motivo: string): string {
  return `https://wa.me/${SOPORTE_TEL_INTL}?text=${encodeURIComponent(`Hola Ritto, ${motivo}`)}`;
}
