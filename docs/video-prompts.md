# Guion y prompts para el video de Ritto

## Lo primero: la IA no filma la pantalla

Ningún generador de video (Sora, Veo, Runway, Kling) dibuja una interfaz legible.
Si le pedís "una pantalla mostrando una factura con el RUT y el IVA", te devuelve
texto deforme y números inventados. Queda amateur y encima muestra datos falsos
de un producto fiscal, que es justo lo que no querés.

El video profesional se arma **híbrido**:

- **La pantalla real** sale de tu captura de OBS (ya la tenés configurada en
  1920×1080, monitor capture). Eso es el corazón del video y no se reemplaza.
- **La IA genera el ambiente**: manos, papeles, escritorios, luz, abstracciones.
  Es el relleno que hace que respire y parezca producción, no screencast.

Los prompts de abajo son solo para el ambiente. Van **en inglés**: todos estos
modelos rinden bastante peor en español.

---

## Clips de ambiente (5 s cada uno)

**1 — El problema**
> Cinematic close-up of a messy stack of paper invoices and receipts piled on a
> wooden office desk, warm afternoon window light, shallow depth of field, slow
> push-in camera move, muted natural colors, 35mm film look, no text visible.

**2 — El trabajo manual**
> Over-the-shoulder shot of a person's hands typing numbers into a laptop late at
> night, small desk lamp, tired posture, cool blue screen glow on their face,
> static tripod shot, cinematic, shallow focus, no readable screen content.

**3 — La transición (el clip clave)**
> Paper documents on a desk slowly dissolving into small floating green particles
> that drift upward and away, dark neutral background, elegant slow motion,
> emerald green #0a7c59 accents, minimal, premium, abstract.

**4 — El alivio**
> Clean minimal desk with an empty surface, a single cup of coffee and a closed
> laptop, soft morning light through a window, calm atmosphere, slow dolly right,
> bright airy color grade, no clutter.

**5 — Abstracto de datos**
> Abstract flowing lines of soft emerald green light organizing themselves into a
> neat orderly grid pattern on a clean off-white background, smooth elegant
> motion, minimal, no text, no numbers, premium tech aesthetic.

**6 — Contexto uruguayo**
> Wide shot of a small family-run business storefront in Montevideo, Uruguay,
> warm late afternoon light, owner standing at the counter, documentary style,
> natural colors, gentle handheld movement.

**7 — El cierre**
> Slow motion shot of a woman business owner smiling while closing a laptop,
> bright modern small office, plants in the background, natural window light,
> warm optimistic mood, shallow depth of field.

**8 — Placa final**
> Soft emerald green and white gradient slowly swirling, abstract, minimal,
> plenty of empty negative space in the center, calm premium motion background.

---

## Cómo montarlo

Orden sugerido, 30 s totales:

| Tiempo | Material | Texto en pantalla |
|---|---|---|
| 0–4 s | Clip 1 | *¿Cuántas horas al mes cargás facturas a mano?* |
| 4–8 s | Clip 2 | — |
| 8–11 s | Clip 3 | — |
| 11–20 s | **Tu captura de OBS** | *Subís el XML. Ritto hace el resto.* |
| 20–24 s | Clip 5 | *RUT, IVA, totales — directo a tu planilla* |
| 24–27 s | Clip 7 | — |
| 27–30 s | Clip 8 | Logo **ritto** + *ritto.lat* |

Detalles que separan lo amateur de lo profesional:

- **Acelerá tu screencast 1.5×–2×.** El tiempo real de subir un archivo se hace
  eterno en un video. Cortá los momentos muertos de carga.
- **Zoom suave sobre la captura.** Un lento push-in sobre la zona donde aparecen
  los datos dirige la mirada. Sin eso, el espectador no sabe adónde mirar.
- **Igualá el color.** Los clips de IA vienen cada uno con su temperatura. Pasá
  todo por el mismo grade tirando levemente a verde para que peguen con la marca.
- **Cortes al ritmo de la música.** Elegí la música primero y cortá en los golpes,
  no al revés.
- **Tipografía de marca:** DM Serif Display para los títulos, Figtree para el
  resto. Son las mismas de la landing.
- **Sin audio de IA.** Las voces sintéticas se notan. Música instrumental y texto.

Exportá dos versiones: **16:9** para la landing y **9:16** para Instagram y
WhatsApp, que es por donde te van a llegar los clientes acá.

---

## Imágenes del fondo del hero

El fondo animado ya funciona sin imágenes: son orbes de gradiente en CSS puro,
cero peso, cero archivos. Si querés fotos rotando encima, generalas con estos
prompts, guardalas en `public/hero/` y listalas en `BG_IMAGES` dentro de
`src/pages/index.tsx`.

> Minimal overhead flat lay of neatly organized paper documents on a soft
> off-white surface, subtle emerald green accents, lots of empty space, bright
> even lighting, muted premium color palette, photographic.

> Soft focus abstract background of pale green and white organic shapes, very
> low contrast, calm, plenty of negative space, no objects, no text.

> Clean modern desk from above with a laptop, a notebook and a coffee cup on a
> light surface, natural daylight, airy minimal composition, muted tones, wide
> empty area on the left side.

Tres reglas para que no arruinen el hero:

1. **Muy bajo contraste.** Van detrás del título; si compiten, no se lee nada.
   El código ya les pone un velo blanco encima, pero partí de imágenes suaves.
2. **Horizontales y con aire.** Formato 16:9 o más anchas, con la zona del centro
   despejada.
3. **Livianas.** Convertilas a `.webp` y bajalas de 300 KB cada una, o el hero
   —que es lo primero que carga— se vuelve lento.
