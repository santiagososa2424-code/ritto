# Video de Ritto — clips, fotos y prompt para la IA

## Qué hay acá

De los 3:53 de grabación salieron **8 clips de 9 a 12 segundos** y **7 fotos**, todos
en 1920×1080, ya recortados a la zona útil, acelerados donde sobraba tiempo muerto
y sin la barra de tareas ni la marca de agua *"Activar Windows"* que aparecía abajo
a la derecha.

| # | Archivo | Dur. | Qué muestra |
|---|---|---|---|
| 1 | `1-landing-planes.mp4` | 12 s | La home: *"Tus facturas, procesadas en segundos"*, el mockup y los planes |
| 2 | `2-crear-cuenta.mp4` | 10 s | El alta: nombre, empresa, RUT, teléfono, mail |
| 3 | `3-conectar-google.mp4` | 12 s | *"Elige una cuenta"* de Google y la vuelta a Configuración ya conectado |
| 4 | `4-configurar-columnas.mp4` | 11 s | El mapeo de columnas y la URL de la planilla |
| 5 | `5-subir-factura.mp4` | 12 s | La zona de subida y el archivo entrando |
| 6 | `6-extraccion-datos.mp4` | 9 s | **El momento clave**: *Procesando…* y la fila que se completa sola |
| 7 | `7-exportar-sheets.mp4` | 11 s | Un clic y *"Datos enviados a tu planilla"* |
| 8 | `8-dashboard.mp4` | 12 s | El dashboard: totales, IVA y top proveedores |

Fotos: `foto-1-landing`, `foto-2-columnas`, `foto-3-procesando`,
**`foto-4-datos-listos`** (la mejor para portada), `foto-5-exportada`,
`foto-6-dashboard`, `foto-7-dos-facturas`.

---

## Datos personales: qué se tapó

Los clips venían con información sensible a la vista. Ya está resuelto:

- **Nombres y RUT de proveedores reales** (clips 6, 7 y 8, fotos 4, 6 y 7). Se
  reemplazaron por **Proveedor S.A.** y **Comercial SRL**, escritos con el mismo
  cuerpo y color que la tabla para que no se note el retoque. El RUT quedó tapado.
  Los montos, fechas y estados siguen intactos: lo que se ve funcionando es real.
- **Tu teléfono y tu mail** en el autocompletado del navegador (clip 2, segundos
  3,4 a 9,6). Difuminados.

Queda una sola cosa a criterio tuyo: **la URL de tu planilla** se ve en el clip 4.
No le da acceso a nadie que no tenga permisos, así que podés dejarla; si preferís,
avisame y la difumino también.

Si en algún momento regrabás, lo ideal igual es usar una factura de prueba a
nombre de una empresa inventada — sale más limpio que tapar en posproducción.

---

## El prompt para la IA

Copiá esto tal cual y subí los 8 clips junto con el pedido.

> Necesito un video promocional de 30 segundos para Ritto, un software uruguayo
> que lee facturas electrónicas (CFE) y vuelca los datos a Google Sheets sin
> cargarlos a mano. El público son dueños de pymes y contadores en Uruguay.
>
> Te adjunto 8 clips de pantalla reales del producto. Usalos como material
> principal, en este orden: 5 (subir factura), 6 (los datos se extraen solos),
> 7 (exportar a la planilla), 8 (el dashboard), 1 (la home con los planes).
>
> Estilo: limpio, sobrio y confiable, tipo software financiero moderno. Nada de
> efectos llamativos, brillos ni transiciones 3D. Cortes secos o fundidos muy
> cortos. Color de marca verde #0a7c59 sobre fondo gris muy claro #f5f5f7.
> Tipografía serif elegante para los títulos y sans-serif limpia para el resto.
>
> Agregá un leve zoom lento sobre cada clip para que nada quede estático, y
> sobre el clip 6 hacé un acercamiento a la fila de la tabla justo cuando se
> completan los datos: ese es el momento más importante del video.
>
> Textos en pantalla, en español rioplatense, uno por tramo:
> 1. "¿Cuántas horas al mes cargás facturas a mano?"
> 2. "Subís la factura."
> 3. "Ritto extrae RUT, IVA y totales."
> 4. "Y va directo a tu planilla."
> 5. "ritto.lat — probá 14 días gratis"
>
> Música instrumental suave, moderna y optimista, sin voz en off. Los cortes
> tienen que caer con el ritmo. Entregame dos versiones: 16:9 y 9:16.

Si la herramienta no acepta clips propios y solo genera imagen, no le pidas que
dibuje la pantalla del sistema: ninguna IA de video hace una interfaz legible, te
va a devolver texto deforme y números inventados. En ese caso usala solo para el
ambiente, con los prompts de abajo, y montá tus clips por encima.

---

## Clips de ambiente generados por IA (opcional)

Van en inglés: estos modelos rinden bastante peor en español.

**El problema**
> Cinematic close-up of a messy stack of paper invoices and receipts piled on a
> wooden office desk, warm afternoon window light, shallow depth of field, slow
> push-in camera move, muted natural colors, 35mm film look, no text visible.

**El trabajo manual**
> Over-the-shoulder shot of a person's hands typing numbers into a laptop late at
> night, small desk lamp, tired posture, cool blue screen glow, static tripod
> shot, cinematic, shallow focus, no readable screen content.

**La transición**
> Paper documents on a desk slowly dissolving into small floating green particles
> that drift upward and away, dark neutral background, elegant slow motion,
> emerald green accents, minimal, premium, abstract.

**El cierre**
> Slow motion shot of a business owner smiling while closing a laptop, bright
> modern small office, plants in the background, natural window light, warm
> optimistic mood, shallow depth of field.

---

## El fondo del hero

No lleva imágenes. Son cintas horizontales con la marca repetida y separada por
puntos, cada palabra en una tipografía distinta, corriendo en sentidos opuestos
sobre unos orbes verdes difuminados. Todo en CSS: cero archivos, cero descargas.

Las tipografías son las dos de la marca —DM Serif Display y Figtree— más familias
que ya trae cualquier sistema (Times, Courier, Trebuchet, Verdana, Palatino,
Georgia), así que la variedad no cuesta una sola petición de red.

Se ajusta desde dos listas en `src/pages/index.tsx`: `FACES` son las tipografías
que rotan palabra a palabra, y `BANDS` define cada cinta —altura, tamaño,
opacidad, dirección, velocidad y desenfoque—. Agregar o sacar una cinta es
agregar o sacar una línea de `BANDS`.

En pantallas chicas todo se achica desde una sola variable (`--scale`), y con
`prefers-reduced-motion` las cintas quedan quietas.
