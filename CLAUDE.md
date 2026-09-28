# Ritto

Lee facturas uruguayas y las escribe adentro de la planilla de Google Sheets que el
cliente ya tiene armada, **sin romperle las fórmulas**.

El usuario saca una foto del comprobante (o sube el PDF, o el XML del CFE). Ritto extrae
proveedor, RUT, fecha, número, IVA, totales e ítems, y con un clic escribe la fila en la
pestaña de ese proveedor, en el lugar que le toca por fecha. Los totales, las deudas y
los acumulados los sigue calculando la planilla del usuario: Ritto no los toca.

## Para quién

Comercios y pymes de Uruguay que ya llevan su contabilidad en una planilla propia —una
pestaña por proveedor, fórmulas de totales y deudas— y cargan las facturas a mano.

**El cliente que paga hoy es un comercio, no un contador.** Es una distinción que
importa: hay features que parecen obvias (panel de "qué cliente me mandó todo", calendario
DGI) y son de otro producto, con otro comprador. No mezclar antes de tener el primero
sólido.

**El diferencial no es leer facturas** —eso lo hace cualquiera con un modelo— **es
escribir adentro de una planilla ajena sin romperla.** Ahí se fueron semanas y es
genuinamente difícil. Es lo que hay que defender y vender.

## Stack

- **Next.js 14**, Pages Router, TypeScript. Desplegado en Vercel.
- **Supabase**: Postgres + Auth + RLS. La service role key sólo se usa del lado del servidor.
- **Google Sheets API v4** para escribir en la planilla del cliente.
- **Gemini**: `gemini-3.6-flash` para extraer datos del comprobante, `gemini-2.0-flash`
  para mapear columnas.
- **Mercado Pago** para las suscripciones.
- **Resend** para el mail de bienvenida.

Sin dependencias de testing: los tests corren con `node --test`, que soporta TypeScript
de forma nativa desde Node 22.

## Estructura

```
src/
  pages/
    index.tsx          landing
    login.tsx          login + registro (email o Google)
    app.tsx            pantalla principal: subir facturas, lista, exportar
    dashboard.tsx      totales, IVA, gráficos
    settings.tsx       Google Sheets, columnas, equipo, cuenta
    guia.tsx           guía de uso
    onboarding.tsx     alta: nombre, empresa, plan
    reset-password.tsx formulario de contraseña nueva
    admin/errores.tsx  panel de errores en vivo (sólo ADMIN_EMAIL)
    api/
      extract.ts       lee el comprobante (XML, PDF o foto)
      export.ts        genera el .xlsx
      sheets/append.ts EL MOTOR. Escribe en la planilla del cliente.
      sheets/structure.ts, save-url.ts, save-mapping.ts
      auth/google/     OAuth propio con Google (start, callback, disconnect)
      org/             equipo: invitar, aceptar, panel, quitar
      payments/        Mercado Pago: crear suscripción y webhook
      profile/bootstrap.ts  crea el perfil (el cliente no puede)
      user/delete-account.ts
      admin/errores.ts
  lib/
    sheetLayout.ts     dónde va cada factura (fecha, orden, inserción)  [con tests]
    sheetHeaders.ts    encontrar la fila de encabezado y nombrar columnas [con tests]
    sheetProfile.ts    qué contiene cada columna, según los datos cargados [con tests]
    vendorRules.ts     memoria de a qué pestaña va cada proveedor [con tests]
    tiempoAhorrado.ts  el contador de tiempo [con tests]
    money.ts           parseo de importes uruguayos
    cfeParser.ts       XML del CFE
    geminiExtractor.ts prompts de extracción
    oauthState.ts      state firmado con HMAC para el OAuth
    errorLog.ts        registro de errores
    soporte.ts         teléfono de soporte, en un solo lugar
    fixtures/planillas.ts  ocho formas de planilla, para los tests
  components/
    Sidebar.tsx        resuelve solo su contexto (empresa, plan, organización)
    HeroBackground.tsx fondo animado del home
    TypedDomain.tsx    "ritto.lat" tipeándose
supabase/migrations/   001 a 010 (no hay 005: falló y se reemplazó por la 007)
```

## Decisiones de arquitectura, y por qué

Cada una de estas salió de un bug real. Si algo parece dado vuelta, probablemente sea a
propósito.

**Nunca se pisa una celda con fórmula, y se decide celda por celda, no por columna.**
Mirar la columna entera trataba igual a "Deuda" (fórmula en cada fila, hay que
respetarla) y a "Costo" (fórmula sólo en la suma de abajo, la fila de la factura la llena
el usuario). Por eso las facturas entraban sin importe durante semanas. Se lee la fila de
destino con `valueRenderOption=FORMULA` y se decide ahí.

**Se escribe por segmentos, nunca un PUT sobre todo el rango.** Un `""` borra una fórmula
igual que un valor. Las columnas protegidas no entran en ninguna petición.

**Para insertar una fila se usa `insertDimension` adentro de la tabla, nunca al final.**
Sheets estira un rango cuando la fila nueva cae adentro, pero no cuando cae justo antes o
justo después. Si la factura es la más vieja de todas se inserta una fila más abajo y se
corre la primera: insertarla arriba la dejaría fuera del total del mes.

**No se usa `sortRange`.** Reordenaría la planilla entera del cliente, incluida la fila
de totales y lo que tenga más abajo. El orden se resuelve eligiendo bien la fila de
inserción. Si la columna de fechas no viene ordenada, Ritto no impone un orden.

**El tipo de cada columna se deduce de los datos cargados, no del nombre del
encabezado.** Una columna llamada "Día" llena de fechas es de fechas. Y un dato que no
coincide con el tipo de su columna no se escribe: es la barrera que evita que una fecha
termine en una columna de importes.

**La memoria de proveedores va por RUT, con el nombre como respaldo.** El nombre cambia
entre facturas del mismo proveedor (razón social, nombre fantasía, el titular). El RUT
son doce dígitos y no se mueve.

**Los tokens de Google nunca llegan al navegador.** Por eso el OAuth es propio
(`api/auth/google/`) y no el de Supabase: el de Supabase devuelve el token del proveedor
al cliente. Las consultas a `profiles` llevan lista explícita de columnas, nunca `*`,
porque el rol `authenticated` no tiene permiso sobre las columnas de credenciales.

**El perfil lo crea el servidor, no el cliente.** `plan`, `subscription_status` y
`trial_ends_at` viven en `profiles`: con permiso de INSERT desde el navegador, cualquiera
se activaba un plan pago desde la consola. Ver migración 007.

**Los errores se muestran tal como los manda el servidor.** Antes se reemplazaban por
tres textos fijos y cualquier error real se leía como "Error al exportar", que costó días
de diagnóstico.

## Qué está terminado

- Lectura de comprobantes: XML de CFE, PDF y foto. Notas de crédito con signo negativo.
- Exportación a Google Sheets: pestaña por proveedor, orden por fecha (ascendente o
  descendente, según cómo venga la planilla), respeto de fórmulas, aviso cuando no
  encuentra dónde escribir el importe.
- Memoria de proveedores por RUT, con "enviar y recordar".
- Detección de comprobantes repetidos, incluso si se vuelve a subir el archivo.
- Aviso cuando la factura no está en pesos y la pestaña no tiene columna de moneda.
- Dashboard con totales, IVA y notas de crédito restando.
- Equipo: invitar, aceptar, panel del dueño, quitar miembros.
- Pagos con Mercado Pago, trial de 14 días.
- Login con email o con Google.
- Panel de errores en vivo en `/admin/errores`.
- 50 tests sobre la lógica de exportación (`npm test`).

## Qué falta, por orden

1. **Verificar la app en Google.** Está *publicada* (entra cualquiera) pero **no
   verificada**: a todos les aparece "Google no verificó esta app". Publicar y verificar
   son dos estados distintos en la consola. Hace falta dominio verificado, logo, links a
   privacidad y términos, un video de YouTube mostrando el flujo, y justificar el
   permiso. Tarda semanas. Es lo que más frena la venta.
2. **Registro de exportaciones.** Guardar qué escribió Ritto: planilla, pestaña, fila,
   valores, cuándo. Da auditoría y permite deshacer. Hoy, si Ritto escribe algo mal en la
   contabilidad de un cliente, no hay registro ni vuelta atrás. Es el riesgo comercial
   más grande que tiene el producto. La mitad ya existe: `append.ts` calcula `targetRow`
   y `writtenIdx` y los tira al terminar.
3. **Probar el flujo de equipo de punta a punta.** Pagar Pyme → invitar → aceptar → ver
   el panel → quitar un miembro → cancelar. Nunca se hizo ni una vez.
4. **Reemplazar "uso mensual" por IVA compras del mes** en el dashboard. Es el número que
   un contador mira para la liquidación. Los datos ya están.
5. **Ingesta por mail.** Que las facturas entren solas sin que nadie suba nada. Es lo más
   valioso que falta y lo más caro.

## Bugs conocidos y cosas a medio hacer

- **El orden por fecha puede no aplicarse y no hay forma de verlo desde afuera.** Se
  arregló tres veces. El debug de `/api/sheets/append` devuelve `_debug.invoices[].ordenPor`
  (por qué columna ordenó) y `ordenada` (si la pestaña le pareció ordenada). Sin esos dos
  campos de una exportación real, cualquier arreglo es a ciegas.
- **Dos supuestos sin cubrir**, esperando una planilla real que los tenga: dos tablas en
  la misma pestaña, y plantillas cuyos totales están más abajo de la fila 20 (la
  detección de fórmulas sólo lee 20 filas). Están documentados como fixtures pendientes
  en `src/lib/fixtures/planillas.ts`.
- **`/api/extract` devuelve `detail`** con el mensaje interno del error. No se muestra en
  pantalla pero viaja al navegador.
- **El rate limit es por instancia.** En serverless cada instancia tiene su propio
  contador, así que no limita de verdad. Necesita estado compartido.
- **Los tokens de Google están en texto plano en la base.** Protegidos por permisos de
  columna, no cifrados.
- **La sesión vive en localStorage**, no en una cookie httpOnly.
- **Sin CSP ni headers de seguridad.**
- **`main` está en septiembre.** Todo el trabajo posterior vive en
  `claude/create-ritto-LVdxf`. Si Vercel despliega desde `main`, el sitio sirve una
  versión vieja. **Verificar en Vercel → Settings → Git → Production Branch antes de
  diagnosticar cualquier bug reportado.**
- **Migraciones 008, 009 y 010 hay que correrlas a mano** en el SQL Editor de Supabase si
  se levanta una base nueva. Sin la 010 (`exported_at`) las facturas no quedan marcadas
  como exportadas y cada clic en exportar escribe una fila repetida.

## Variables de entorno

Sólo los nombres. **Los valores van únicamente en Vercel, nunca en el repo.**

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio. **Sólo servidor.** |
| `GOOGLE_CLIENT_ID` | OAuth con Google |
| `GOOGLE_CLIENT_SECRET` | OAuth con Google. **Sólo servidor.** |
| `GOOGLE_REDIRECT_URI` | Callback del OAuth |
| `OAUTH_STATE_SECRET` | Firma HMAC del `state` del OAuth |
| `GEMINI_API_KEY` | Extracción y mapeo de columnas |
| `MP_ACCESS_TOKEN` | Mercado Pago. **Sólo servidor.** |
| `MP_WEBHOOK_SECRET` | Valida el webhook de Mercado Pago |
| `RESEND_API_KEY` | Mail de bienvenida |
| `NEXT_PUBLIC_SITE_URL` | URL pública del sitio |
| `ADMIN_EMAIL` | Quién ve `/admin/errores`. Por defecto, el mail de soporte. |

## Cómo levantarlo

```bash
npm install
cp .env.example .env.local     # y completar con los valores de Vercel
npm run dev                    # http://localhost:3000
```

```bash
npm test          # 50 tests, sin instalar nada (Node 22+)
npm run build     # build de producción
npx tsc --noEmit  # chequeo de tipos
```

Las migraciones se corren a mano, en orden, desde el SQL Editor de Supabase.

### Al tocar el motor de exportación

`src/pages/api/sheets/append.ts` es la parte más frágil del sistema: se rompió cuatro
veces y cada vez le escribió mal en la planilla a un cliente. La lógica que se puede
probar está afuera, en `lib/sheetLayout.ts`, `sheetHeaders.ts`, `sheetProfile.ts` y
`vendorRules.ts`.

**Correr `npm test` antes y después de cualquier cambio ahí.** Si aparece una planilla
con una forma nueva, agregarla a `src/lib/fixtures/planillas.ts` con lo que Ritto debería
deducir: los tests la cubren sola y queda documentada.

### Idioma

El producto, los comentarios y los mensajes de commit están en español rioplatense. Los
comentarios explican **por qué** está hecho así —casi siempre, qué se rompió antes— no
qué hace la línea.
